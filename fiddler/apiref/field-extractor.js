define(function(require) {
"use strict";

var ApirefCache = require("./cache").ApirefCache;


function fetchMethodFieldDefs(client, methodPath, done) {
    ApirefCache.fetchMethodInfo(client, methodPath, function(methodInfo) {
        done(parseMethodFieldDefsInReturnsSection(methodInfo.returns));
    }, function() {
        done({});
    });
}

// Available fields:
// Blah blah. Available fields are:
// Each dictionary contains following fields:
// Blah blah. Allowed fields include:
var availableFieldsRegExp = /\bfields\b[\s\w\d]*:\s*$/mi;

/**
 * Parses the contents of returns section (as returned by "apiref/method" method) and returns
 * a mapping from field names to field definitions. Each field definition is an object with
 * the following properties:
 *   - name - the name of the field
 *   - group - either "primary" or "secondary"
 *   - refs (optional) - the name of the method that defines possible subfields
 *   - refsPrimaryOnly (optional) - true if only primary fields of the method specified in "refs" key
 *     are referenced, false otherwise
 */
function parseMethodFieldDefsInReturnsSection(returnsSection) {
    var container, headerNode;

    container = document.createElement("div");
    container.innerHTML = returnsSection;

    for (headerNode = container.firstChild; headerNode; headerNode = headerNode.nextSibling) {
        if (headerNode.nodeName.toLowerCase() === "p" && availableFieldsRegExp.test(headerNode.textContent)) {
            for (headerNode = headerNode.nextSibling; headerNode && headerNode.nodeName === "#text"; ) {
                headerNode = headerNode.nextSibling;
            }
            if (headerNode && headerNode.nodeName.toLowerCase() === "ul") {
                return parseMethodFieldDefsList(headerNode);
            }
            return {};
        }
    }
    return {};
}

function getChildNodeByName(node, childName, defaultValue) {
    var childNode;

    for (childNode = node.firstChild; childNode; childNode = childNode.nextSibling) {
        if (childNode.nodeName.toLowerCase() === childName) {
            return childNode;
        }
    }
    return defaultValue === undefined ? null : defaultValue;
}

function getChildNodeTextByName(node, childName, defaultValue) {
    var childNode = getChildNodeByName(node, childName);
    return childNode ? childNode.textContent : defaultValue === undefined ? null : defaultValue;
}

function parseMethodFieldDefsList(node) {
    var liNode, liUlNode, hasGroups = false, groupName, text, fields = {};

    for (liNode = node.firstChild; liNode; liNode = liNode.nextSibling) {
        if (liNode.nodeName.toLowerCase() !== "li") {
            continue;
        }
        text = getChildNodeTextByName(liNode, "p", "").trim();
        if (text === "Primary:") {
            groupName = "primary";
        } else if (text === "Secondary:") {
            groupName = "secondary";
        } else if (hasGroups) {
            continue;
        } else {
            parseFieldGroupDefinition(liNode, "primary", fields);
            return fields;
        }
        hasGroups = true;

        for (liUlNode = liNode.firstChild; liUlNode; liUlNode = liUlNode.nextSibling) {
            if (liUlNode.nodeName.toLowerCase() === "ul") {
                parseFieldGroupDefinition(liUlNode.firstChild, groupName, fields);
                break;
            }
        }
    }
    return fields;
}

function parseFieldGroupDefinition(nodeIt, groupName, outFields) {
    var nameNode, fieldName, fieldDef;

    for (; nodeIt; nodeIt = nodeIt.nextSibling) {
        if (nodeIt.nodeName.toLowerCase() === "li") {
            nameNode = nodeIt.getElementsByTagName("b")[0];
            if (nameNode) {
                fieldName = nameNode.textContent.trim();
                if (/^[a-zA-Z0-9_]+$/.test(fieldName)) {
                    fieldDef = {
                        name: fieldName,
                        group: groupName
                    };
                    getSubfieldDefinition(nodeIt, fieldDef);
                    outFields[fieldName] = fieldDef;
                }
            }
        }
    }
}

var subfieldReferenceRegExp = /(^\s*(This field references|Each element of this list is a))|\bsubfield selector\b/;

function parseApirefMethodURL(url) {
    var match = url.match(/developers\/api\/(services\/[a-z0-9_\/]+\/)#([a-z0-9_]+)$/);
    if (match) {
        return match[1] + match[2];
    } else {
        return null;
    }
}

function getSubfieldDefinition(liNode, outFieldDef) {
    var nodeIt, aNodes, foundMethodName, methodName, i;

    outerLoop: for (nodeIt = liNode.firstChild; nodeIt; nodeIt = nodeIt.nextSibling) {
        if (nodeIt.nodeName.toLowerCase() === "p" && subfieldReferenceRegExp.test(nodeIt.textContent)) {
            aNodes = nodeIt.getElementsByTagName("a");
            foundMethodName = null;
            for (i = 0; i < aNodes.length; i++) {
                methodName = parseApirefMethodURL(aNodes[i].href);
                if (methodName) {
                    if (foundMethodName) {
                        continue outerLoop;
                    } else {
                        foundMethodName = methodName;
                    }
                }
            }
            if (foundMethodName) {
                outFieldDef.refs = foundMethodName;

                if (/only\s+primary\s+are\s+allowed/.test(nodeIt.textContent)) {
                    outFieldDef.refsPrimaryOnly = true;
                }
            }
        }
    }
}

function fetchFieldNamesForChain(client, methodPath, fieldChain, done, primaryOnly) {
    fetchMethodFieldDefs(client, methodPath, function(fields) {
        var field, fieldNames;

        if (fieldChain.length === 0) {
            fieldNames = Object.getOwnPropertyNames(fields);
            if (primaryOnly) {
                fieldNames = fieldNames.filter(function(fieldName) {
                    return fields[fieldName].group === "primary";
                });
            }
            done(fieldNames);
        } else {
            field = fields[fieldChain[0]];
            if (field && field.refs) {
                fetchFieldNamesForChain(client, field.refs, fieldChain.slice(1), done, field.refsPrimaryOnly);
            } else {
                done({});
            }
        }
    });
}

function parseParamFieldRefs(desc, ownerMethodName) {
    var descNode, aNodes, i, methodName, methodNameRef, primaryOnly;

    descNode = document.createElement("div");
    descNode.innerHTML = desc;
    aNodes = descNode.getElementsByTagName("a");
    methodNameRef = null;
    for (i = 0; i < aNodes.length; i++) {
        methodName = parseApirefMethodURL(aNodes[i].href);
        if (methodName) {
            if (methodNameRef) {
                return null;
            } else {
                methodNameRef = methodName;
            }
        }
    }

    if (methodNameRef) {
        primaryOnly = /primary fields/.test(descNode.textContent);
        return {
            refs: methodNameRef,
            refsPrimaryOnly: primaryOnly
        };
    } else {
        return {
            refs: ownerMethodName
        };
    }
}

function fetchParamFieldNames(client, methodPath, paramName, fieldChain, done) {
    ApirefCache.fetchMethodInfo(client, methodPath, function(methodInfo) {
        var i, fieldRefs;

        for (i = 0; i < methodInfo.arguments.length; i++) {
            if (methodInfo.arguments[i].name === paramName) {
                fieldRefs = parseParamFieldRefs(methodInfo.arguments[i].description, methodPath);
                if (fieldRefs) {
                    fetchFieldNamesForChain(client, fieldRefs.refs, fieldChain, done, fieldRefs.refsPrimaryOnly);
                } else {
                    done([]);
                }
                return;
            }
        }
        done([]);
    }, function() {
        done([]);
    });
}


return {
    fetchParamFieldNames: fetchParamFieldNames
};

});
