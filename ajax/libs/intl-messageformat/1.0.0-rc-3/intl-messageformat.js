(function() {
    "use strict";
    var $$utils$$hop = Object.prototype.hasOwnProperty;

    function $$utils$$extend(obj) {
        var sources = Array.prototype.slice.call(arguments, 1),
            i, len, source, key;

        for (i = 0, len = sources.length; i < len; i += 1) {
            source = sources[i];
            if (!source) { continue; }

            for (key in source) {
                if ($$utils$$hop.call(source, key)) {
                    obj[key] = source[key];
                }
            }
        }

        return obj;
    }

    // Purposely using the same implementation as the Intl.js `Intl` polyfill.
    // Copyright 2013 Andy Earnshaw, MIT License

    var $$es5$$realDefineProp = (function () {
        try { return !!Object.defineProperty({}, 'a', {}); }
        catch (e) { return false; }
    })();

    var $$es5$$es3 = !$$es5$$realDefineProp && !Object.prototype.__defineGetter__;

    var $$es5$$defineProperty = $$es5$$realDefineProp ? Object.defineProperty :
            function (obj, name, desc) {

        if ('get' in desc && obj.__defineGetter__) {
            obj.__defineGetter__(name, desc.get);
        } else if (!$$utils$$hop.call(obj, name) || 'value' in desc) {
            obj[name] = desc.value;
        }
    };

    var $$es5$$objCreate = Object.create || function (proto, props) {
        var obj, k;

        function F() {}
        F.prototype = proto;
        obj = new F();

        for (k in props) {
            if ($$utils$$hop.call(props, k)) {
                $$es5$$defineProperty(obj, k, props[k]);
            }
        }

        return obj;
    };

    var $$es5$$fnBind = Function.prototype.bind || function (thisObj) {
        var fn   = this,
            args = [].slice.call(arguments, 1);

        return function () {
            fn.apply(thisObj, args.concat([].slice.call(arguments)));
        };
    };
    var $$compiler$$default = $$compiler$$Compiler;

    function $$compiler$$Compiler(locales, formats, pluralFn) {
        this.locales  = locales;
        this.formats  = formats;
        this.pluralFn = pluralFn;
    }

    $$compiler$$Compiler.prototype.compile = function (ast) {
        this.pluralStack        = [];
        this.currentPlural      = null;
        this.pluralNumberFormat = null;

        return this.compileMessage(ast);
    };

    $$compiler$$Compiler.prototype.compileMessage = function (ast) {
        if (!(ast && ast.type === 'messageFormatPattern')) {
            throw new Error('Message AST is not of type: "messageFormatPattern"');
        }

        var elements = ast.elements,
            pattern  = [];

        var i, len, element;

        for (i = 0, len = elements.length; i < len; i += 1) {
            element = elements[i];

            switch (element.type) {
                case 'messageTextElement':
                    pattern.push(this.compileMessageText(element));
                    break;

                case 'argumentElement':
                    pattern.push(this.compileArgument(element));
                    break;

                default:
                    throw new Error('Message element does not have a valid type');
            }
        }

        return pattern;
    };

    $$compiler$$Compiler.prototype.compileMessageText = function (element) {
        // When this `element` is part of plural sub-pattern and its value contains
        // an unescaped '#', use a `PluralOffsetString` helper to properly output
        // the number with the correct offset in the string.
        if (this.currentPlural && /(^|[^\\])#/g.test(element.value)) {
            // Create a cache a NumberFormat instance that can be reused for any
            // PluralOffsetString instance in this message.
            if (!this.pluralNumberFormat) {
                this.pluralNumberFormat = new Intl.NumberFormat(this.locales);
            }

            return new $$compiler$$PluralOffsetString(
                    this.currentPlural.id,
                    this.currentPlural.format.offset,
                    this.pluralNumberFormat,
                    element.value);
        }

        // Unescape the escaped '#'s in the message text.
        return element.value.replace(/\\#/g, '#');
    };

    $$compiler$$Compiler.prototype.compileArgument = function (element) {
        var format   = element.format,
            formats  = this.formats,
            locales  = this.locales,
            pluralFn = this.pluralFn,
            options;

        if (!format) {
            return new $$compiler$$StringFormat(element.id);
        }

        switch (format.type) {
            case 'numberFormat':
                options = formats.number[format.style];
                return {
                    id    : element.id,
                    format: new Intl.NumberFormat(locales, options).format
                };

            case 'dateFormat':
                options = formats.date[format.style];
                return {
                    id    : element.id,
                    format: new Intl.DateTimeFormat(locales, options).format
                };

            case 'timeFormat':
                options = formats.time[format.style];
                return {
                    id    : element.id,
                    format: new Intl.DateTimeFormat(locales, options).format
                };

            case 'pluralFormat':
                options = this.compileOptions(element);
                return new $$compiler$$PluralFormat(element.id, format.offset, options, pluralFn);

            case 'selectFormat':
                options = this.compileOptions(element);
                return new $$compiler$$SelectFormat(element.id, options);

            default:
                throw new Error('Message element does not have a valid format type');
        }
    };

    $$compiler$$Compiler.prototype.compileOptions = function (element) {
        var format      = element.format,
            options     = format.options,
            optionsHash = {};

        // Save the current plural element, if any, then set it to a new value when
        // compiling the options sub-patterns. This conform's the spec's algorithm
        // for handling `"#"` synax in message text.
        this.pluralStack.push(this.currentPlural);
        this.currentPlural = format.type === 'pluralFormat' ? element : null;

        var i, len, option;

        for (i = 0, len = options.length; i < len; i += 1) {
            option = options[i];

            // Compile the sub-pattern and save it under the options's selector.
            optionsHash[option.selector] = this.compileMessage(option.value);
        }

        // Pop the plural stack to put back the original currnet plural value.
        this.currentPlural = this.pluralStack.pop();

        return optionsHash;
    };

    // -- Compiler Helper Classes --------------------------------------------------

    function $$compiler$$StringFormat(id) {
        this.id = id;
    }

    $$compiler$$StringFormat.prototype.format = function (value) {
        if (!value) {
            return '';
        }

        return typeof value === 'string' ? value : String(value);
    };

    function $$compiler$$PluralFormat(id, offset, options, pluralFn) {
        this.id       = id;
        this.offset   = offset;
        this.options  = options;
        this.pluralFn = pluralFn;
    }

    $$compiler$$PluralFormat.prototype.getOption = function (value) {
        var options = this.options;

        var option = options['=' + value] ||
                options[this.pluralFn(value - this.offset)];

        return option || options.other;
    };

    function $$compiler$$PluralOffsetString(id, offset, numberFormat, string) {
        this.id           = id;
        this.offset       = offset;
        this.numberFormat = numberFormat;
        this.string       = string;
    }

    $$compiler$$PluralOffsetString.prototype.format = function (value) {
        var number = this.numberFormat.format(value - this.offset);

        return this.string
                .replace(/(^|[^\\])#/g, '$1' + number)
                .replace(/\\#/g, '#');
    };

    function $$compiler$$SelectFormat(id, options) {
        this.id      = id;
        this.options = options;
    }

    $$compiler$$SelectFormat.prototype.getOption = function (value) {
        var options = this.options;
        return options[value] || options.other;
    };

    var intl$messageformat$parser$$default = (function() {
      /*
       * Generated by PEG.js 0.8.0.
       *
       * http://pegjs.majda.cz/
       */

      function peg$subclass(child, parent) {
        function ctor() { this.constructor = child; }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
      }

      function SyntaxError(message, expected, found, offset, line, column) {
        this.message  = message;
        this.expected = expected;
        this.found    = found;
        this.offset   = offset;
        this.line     = line;
        this.column   = column;

        this.name     = "SyntaxError";
      }

      peg$subclass(SyntaxError, Error);

      function parse(input) {
        var options = arguments.length > 1 ? arguments[1] : {},

            peg$FAILED = {},

            peg$startRuleFunctions = { start: peg$parsestart },
            peg$startRuleFunction  = peg$parsestart,

            peg$c0 = [],
            peg$c1 = function(elements) {
                    return {
                        type    : 'messageFormatPattern',
                        elements: elements
                    };
                },
            peg$c2 = peg$FAILED,
            peg$c3 = function(text) {
                    var string = '',
                        i, j, outerLen, inner, innerLen;

                    for (i = 0, outerLen = text.length; i < outerLen; i += 1) {
                        inner = text[i];

                        for (j = 0, innerLen = inner.length; j < innerLen; j += 1) {
                            string += inner[j];
                        }
                    }

                    return string;
                },
            peg$c4 = function(messageText) {
                    return {
                        type : 'messageTextElement',
                        value: messageText
                    };
                },
            peg$c5 = /^[^ \t\n\r,.+={}#]/,
            peg$c6 = { type: "class", value: "[^ \\t\\n\\r,.+={}#]", description: "[^ \\t\\n\\r,.+={}#]" },
            peg$c7 = "{",
            peg$c8 = { type: "literal", value: "{", description: "\"{\"" },
            peg$c9 = null,
            peg$c10 = ",",
            peg$c11 = { type: "literal", value: ",", description: "\",\"" },
            peg$c12 = "}",
            peg$c13 = { type: "literal", value: "}", description: "\"}\"" },
            peg$c14 = function(id, format) {
                    return {
                        type  : 'argumentElement',
                        id    : id,
                        format: format && format[2]
                    };
                },
            peg$c15 = "number",
            peg$c16 = { type: "literal", value: "number", description: "\"number\"" },
            peg$c17 = "date",
            peg$c18 = { type: "literal", value: "date", description: "\"date\"" },
            peg$c19 = "time",
            peg$c20 = { type: "literal", value: "time", description: "\"time\"" },
            peg$c21 = function(type, style) {
                    return {
                        type : type + 'Format',
                        style: style && style[2]
                    };
                },
            peg$c22 = "plural",
            peg$c23 = { type: "literal", value: "plural", description: "\"plural\"" },
            peg$c24 = function(offset, options) {
                    return {
                        type   : 'pluralFormat',
                        offset : offset || 0,
                        options: options
                    }
                },
            peg$c25 = "select",
            peg$c26 = { type: "literal", value: "select", description: "\"select\"" },
            peg$c27 = function(options) {
                    return {
                        type   : 'selectFormat',
                        options: options
                    }
                },
            peg$c28 = "=",
            peg$c29 = { type: "literal", value: "=", description: "\"=\"" },
            peg$c30 = function(selector, pattern) {
                    return {
                        type    : 'optionalFormatPattern',
                        selector: selector,
                        value   : pattern
                    };
                },
            peg$c31 = "offset:",
            peg$c32 = { type: "literal", value: "offset:", description: "\"offset:\"" },
            peg$c33 = function(number) {
                    return number;
                },
            peg$c34 = { type: "other", description: "whitespace" },
            peg$c35 = /^[ \t\n\r]/,
            peg$c36 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
            peg$c37 = { type: "other", description: "optionalWhitespace" },
            peg$c38 = /^[0-9]/,
            peg$c39 = { type: "class", value: "[0-9]", description: "[0-9]" },
            peg$c40 = /^[0-9a-f]/i,
            peg$c41 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
            peg$c42 = "0",
            peg$c43 = { type: "literal", value: "0", description: "\"0\"" },
            peg$c44 = /^[1-9]/,
            peg$c45 = { type: "class", value: "[1-9]", description: "[1-9]" },
            peg$c46 = function(digits) {
                return parseInt(digits, 10);
            },
            peg$c47 = /^[^{}\\\0-\x1F \t\n\r]/,
            peg$c48 = { type: "class", value: "[^{}\\\\\\0-\\x1F \\t\\n\\r]", description: "[^{}\\\\\\0-\\x1F \\t\\n\\r]" },
            peg$c49 = "\\#",
            peg$c50 = { type: "literal", value: "\\#", description: "\"\\\\#\"" },
            peg$c51 = function() { return '\\#'; },
            peg$c52 = "\\{",
            peg$c53 = { type: "literal", value: "\\{", description: "\"\\\\{\"" },
            peg$c54 = function() { return '\u007B'; },
            peg$c55 = "\\}",
            peg$c56 = { type: "literal", value: "\\}", description: "\"\\\\}\"" },
            peg$c57 = function() { return '\u007D'; },
            peg$c58 = "\\u",
            peg$c59 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },
            peg$c60 = function(digits) {
                    return String.fromCharCode(parseInt(digits, 16));
                },
            peg$c61 = function(chars) { return chars.join(''); },

            peg$currPos          = 0,
            peg$reportedPos      = 0,
            peg$cachedPos        = 0,
            peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
            peg$maxFailPos       = 0,
            peg$maxFailExpected  = [],
            peg$silentFails      = 0,

            peg$result;

        if ("startRule" in options) {
          if (!(options.startRule in peg$startRuleFunctions)) {
            throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
          }

          peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
        }

        function text() {
          return input.substring(peg$reportedPos, peg$currPos);
        }

        function offset() {
          return peg$reportedPos;
        }

        function line() {
          return peg$computePosDetails(peg$reportedPos).line;
        }

        function column() {
          return peg$computePosDetails(peg$reportedPos).column;
        }

        function expected(description) {
          throw peg$buildException(
            null,
            [{ type: "other", description: description }],
            peg$reportedPos
          );
        }

        function error(message) {
          throw peg$buildException(message, null, peg$reportedPos);
        }

        function peg$computePosDetails(pos) {
          function advance(details, startPos, endPos) {
            var p, ch;

            for (p = startPos; p < endPos; p++) {
              ch = input.charAt(p);
              if (ch === "\n") {
                if (!details.seenCR) { details.line++; }
                details.column = 1;
                details.seenCR = false;
              } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
                details.line++;
                details.column = 1;
                details.seenCR = true;
              } else {
                details.column++;
                details.seenCR = false;
              }
            }
          }

          if (peg$cachedPos !== pos) {
            if (peg$cachedPos > pos) {
              peg$cachedPos = 0;
              peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
            }
            advance(peg$cachedPosDetails, peg$cachedPos, pos);
            peg$cachedPos = pos;
          }

          return peg$cachedPosDetails;
        }

        function peg$fail(expected) {
          if (peg$currPos < peg$maxFailPos) { return; }

          if (peg$currPos > peg$maxFailPos) {
            peg$maxFailPos = peg$currPos;
            peg$maxFailExpected = [];
          }

          peg$maxFailExpected.push(expected);
        }

        function peg$buildException(message, expected, pos) {
          function cleanupExpected(expected) {
            var i = 1;

            expected.sort(function(a, b) {
              if (a.description < b.description) {
                return -1;
              } else if (a.description > b.description) {
                return 1;
              } else {
                return 0;
              }
            });

            while (i < expected.length) {
              if (expected[i - 1] === expected[i]) {
                expected.splice(i, 1);
              } else {
                i++;
              }
            }
          }

          function buildMessage(expected, found) {
            function stringEscape(s) {
              function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

              return s
                .replace(/\\/g,   '\\\\')
                .replace(/"/g,    '\\"')
                .replace(/\x08/g, '\\b')
                .replace(/\t/g,   '\\t')
                .replace(/\n/g,   '\\n')
                .replace(/\f/g,   '\\f')
                .replace(/\r/g,   '\\r')
                .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
                .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
                .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
                .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
            }

            var expectedDescs = new Array(expected.length),
                expectedDesc, foundDesc, i;

            for (i = 0; i < expected.length; i++) {
              expectedDescs[i] = expected[i].description;
            }

            expectedDesc = expected.length > 1
              ? expectedDescs.slice(0, -1).join(", ")
                  + " or "
                  + expectedDescs[expected.length - 1]
              : expectedDescs[0];

            foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

            return "Expected " + expectedDesc + " but " + foundDesc + " found.";
          }

          var posDetails = peg$computePosDetails(pos),
              found      = pos < input.length ? input.charAt(pos) : null;

          if (expected !== null) {
            cleanupExpected(expected);
          }

          return new SyntaxError(
            message !== null ? message : buildMessage(expected, found),
            expected,
            found,
            pos,
            posDetails.line,
            posDetails.column
          );
        }

        function peg$parsestart() {
          var s0;

          s0 = peg$parsemessageFormatPattern();

          return s0;
        }

        function peg$parsemessageFormatPattern() {
          var s0, s1, s2;

          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parsemessageFormatElement();
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsemessageFormatElement();
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c1(s1);
          }
          s0 = s1;

          return s0;
        }

        function peg$parsemessageFormatElement() {
          var s0;

          s0 = peg$parsemessageTextElement();
          if (s0 === peg$FAILED) {
            s0 = peg$parseargumentElement();
          }

          return s0;
        }

        function peg$parsemessageText() {
          var s0, s1, s2, s3, s4, s5;

          s0 = peg$currPos;
          s1 = [];
          s2 = peg$currPos;
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsechars();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$currPos;
              s3 = peg$parse_();
              if (s3 !== peg$FAILED) {
                s4 = peg$parsechars();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    s3 = [s3, s4, s5];
                    s2 = s3;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$c2;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$c2;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            }
          } else {
            s1 = peg$c2;
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c3(s1);
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsews();
            if (s1 !== peg$FAILED) {
              s1 = input.substring(s0, peg$currPos);
            }
            s0 = s1;
          }

          return s0;
        }

        function peg$parsemessageTextElement() {
          var s0, s1;

          s0 = peg$currPos;
          s1 = peg$parsemessageText();
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c4(s1);
          }
          s0 = s1;

          return s0;
        }

        function peg$parseargument() {
          var s0, s1, s2;

          s0 = peg$parsenumber();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = [];
            if (peg$c5.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c6); }
            }
            if (s2 !== peg$FAILED) {
              while (s2 !== peg$FAILED) {
                s1.push(s2);
                if (peg$c5.test(input.charAt(peg$currPos))) {
                  s2 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c6); }
                }
              }
            } else {
              s1 = peg$c2;
            }
            if (s1 !== peg$FAILED) {
              s1 = input.substring(s0, peg$currPos);
            }
            s0 = s1;
          }

          return s0;
        }

        function peg$parseargumentElement() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8;

          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c7;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$parseargument();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  s5 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 44) {
                    s6 = peg$c10;
                    peg$currPos++;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c11); }
                  }
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parse_();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parseelementFormat();
                      if (s8 !== peg$FAILED) {
                        s6 = [s6, s7, s8];
                        s5 = s6;
                      } else {
                        peg$currPos = s5;
                        s5 = peg$c2;
                      }
                    } else {
                      peg$currPos = s5;
                      s5 = peg$c2;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c2;
                  }
                  if (s5 === peg$FAILED) {
                    s5 = peg$c9;
                  }
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parse_();
                    if (s6 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 125) {
                        s7 = peg$c12;
                        peg$currPos++;
                      } else {
                        s7 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c13); }
                      }
                      if (s7 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c14(s3, s5);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c2;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parseelementFormat() {
          var s0;

          s0 = peg$parsesimpleFormat();
          if (s0 === peg$FAILED) {
            s0 = peg$parsepluralFormat();
            if (s0 === peg$FAILED) {
              s0 = peg$parseselectFormat();
            }
          }

          return s0;
        }

        function peg$parsesimpleFormat() {
          var s0, s1, s2, s3, s4, s5, s6;

          s0 = peg$currPos;
          if (input.substr(peg$currPos, 6) === peg$c15) {
            s1 = peg$c15;
            peg$currPos += 6;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c16); }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c17) {
              s1 = peg$c17;
              peg$currPos += 4;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c18); }
            }
            if (s1 === peg$FAILED) {
              if (input.substr(peg$currPos, 4) === peg$c19) {
                s1 = peg$c19;
                peg$currPos += 4;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c20); }
              }
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 44) {
                s4 = peg$c10;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parsechars();
                  if (s6 !== peg$FAILED) {
                    s4 = [s4, s5, s6];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c2;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c2;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c2;
              }
              if (s3 === peg$FAILED) {
                s3 = peg$c9;
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c21(s1, s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parsepluralFormat() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8;

          s0 = peg$currPos;
          if (input.substr(peg$currPos, 6) === peg$c22) {
            s1 = peg$c22;
            peg$currPos += 6;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s3 = peg$c10;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parseoffset();
                  if (s5 === peg$FAILED) {
                    s5 = peg$c9;
                  }
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parse_();
                    if (s6 !== peg$FAILED) {
                      s7 = [];
                      s8 = peg$parseoptionalFormatPattern();
                      if (s8 !== peg$FAILED) {
                        while (s8 !== peg$FAILED) {
                          s7.push(s8);
                          s8 = peg$parseoptionalFormatPattern();
                        }
                      } else {
                        s7 = peg$c2;
                      }
                      if (s7 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c24(s5, s7);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c2;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parseselectFormat() {
          var s0, s1, s2, s3, s4, s5, s6;

          s0 = peg$currPos;
          if (input.substr(peg$currPos, 6) === peg$c25) {
            s1 = peg$c25;
            peg$currPos += 6;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c26); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s3 = peg$c10;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  s5 = [];
                  s6 = peg$parseoptionalFormatPattern();
                  if (s6 !== peg$FAILED) {
                    while (s6 !== peg$FAILED) {
                      s5.push(s6);
                      s6 = peg$parseoptionalFormatPattern();
                    }
                  } else {
                    s5 = peg$c2;
                  }
                  if (s5 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c27(s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parseselector() {
          var s0, s1, s2, s3;

          s0 = peg$currPos;
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 61) {
            s2 = peg$c28;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c29); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsenumber();
            if (s3 !== peg$FAILED) {
              s2 = [s2, s3];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c2;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c2;
          }
          if (s1 !== peg$FAILED) {
            s1 = input.substring(s0, peg$currPos);
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$parsechars();
          }

          return s0;
        }

        function peg$parseoptionalFormatPattern() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8;

          s0 = peg$currPos;
          s1 = peg$parse_();
          if (s1 !== peg$FAILED) {
            s2 = peg$parseselector();
            if (s2 !== peg$FAILED) {
              s3 = peg$parse_();
              if (s3 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 123) {
                  s4 = peg$c7;
                  peg$currPos++;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c8); }
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parsemessageFormatPattern();
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parse_();
                      if (s7 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                          s8 = peg$c12;
                          peg$currPos++;
                        } else {
                          s8 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c13); }
                        }
                        if (s8 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c30(s2, s6);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c2;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c2;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parseoffset() {
          var s0, s1, s2, s3;

          s0 = peg$currPos;
          if (input.substr(peg$currPos, 7) === peg$c31) {
            s1 = peg$c31;
            peg$currPos += 7;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c32); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$parsenumber();
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c33(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parsews() {
          var s0, s1;

          peg$silentFails++;
          s0 = [];
          if (peg$c35.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c36); }
          }
          if (s1 !== peg$FAILED) {
            while (s1 !== peg$FAILED) {
              s0.push(s1);
              if (peg$c35.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c36); }
              }
            }
          } else {
            s0 = peg$c2;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c34); }
          }

          return s0;
        }

        function peg$parse_() {
          var s0, s1, s2;

          peg$silentFails++;
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parsews();
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsews();
          }
          if (s1 !== peg$FAILED) {
            s1 = input.substring(s0, peg$currPos);
          }
          s0 = s1;
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c37); }
          }

          return s0;
        }

        function peg$parsedigit() {
          var s0;

          if (peg$c38.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c39); }
          }

          return s0;
        }

        function peg$parsehexDigit() {
          var s0;

          if (peg$c40.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c41); }
          }

          return s0;
        }

        function peg$parsenumber() {
          var s0, s1, s2, s3, s4, s5;

          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 48) {
            s1 = peg$c42;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c43); }
          }
          if (s1 === peg$FAILED) {
            s1 = peg$currPos;
            s2 = peg$currPos;
            if (peg$c44.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c45); }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parsedigit();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parsedigit();
              }
              if (s4 !== peg$FAILED) {
                s3 = [s3, s4];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
            if (s2 !== peg$FAILED) {
              s2 = input.substring(s1, peg$currPos);
            }
            s1 = s2;
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c46(s1);
          }
          s0 = s1;

          return s0;
        }

        function peg$parsechar() {
          var s0, s1, s2, s3, s4, s5, s6, s7;

          if (peg$c47.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c48); }
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c49) {
              s1 = peg$c49;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c50); }
            }
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c51();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c52) {
                s1 = peg$c52;
                peg$currPos += 2;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c53); }
              }
              if (s1 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c54();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 2) === peg$c55) {
                  s1 = peg$c55;
                  peg$currPos += 2;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c56); }
                }
                if (s1 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c57();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 2) === peg$c58) {
                    s1 = peg$c58;
                    peg$currPos += 2;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c59); }
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$currPos;
                    s3 = peg$currPos;
                    s4 = peg$parsehexDigit();
                    if (s4 !== peg$FAILED) {
                      s5 = peg$parsehexDigit();
                      if (s5 !== peg$FAILED) {
                        s6 = peg$parsehexDigit();
                        if (s6 !== peg$FAILED) {
                          s7 = peg$parsehexDigit();
                          if (s7 !== peg$FAILED) {
                            s4 = [s4, s5, s6, s7];
                            s3 = s4;
                          } else {
                            peg$currPos = s3;
                            s3 = peg$c2;
                          }
                        } else {
                          peg$currPos = s3;
                          s3 = peg$c2;
                        }
                      } else {
                        peg$currPos = s3;
                        s3 = peg$c2;
                      }
                    } else {
                      peg$currPos = s3;
                      s3 = peg$c2;
                    }
                    if (s3 !== peg$FAILED) {
                      s3 = input.substring(s2, peg$currPos);
                    }
                    s2 = s3;
                    if (s2 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c60(s2);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                }
              }
            }
          }

          return s0;
        }

        function peg$parsechars() {
          var s0, s1, s2;

          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parsechar();
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$parsechar();
            }
          } else {
            s1 = peg$c2;
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c61(s1);
          }
          s0 = s1;

          return s0;
        }

        peg$result = peg$startRuleFunction();

        if (peg$result !== peg$FAILED && peg$currPos === input.length) {
          return peg$result;
        } else {
          if (peg$result !== peg$FAILED && peg$currPos < input.length) {
            peg$fail({ type: "end", description: "end of input" });
          }

          throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
        }
      }

      return {
        SyntaxError: SyntaxError,
        parse:       parse
      };
    })();

    var $$core$$default = $$core$$MessageFormat;

    // -- MessageFormat --------------------------------------------------------

    function $$core$$MessageFormat(message, locales, formats) {
        // Parse string messages into an AST.
        var ast = typeof message === 'string' ?
                $$core$$MessageFormat.__parse(message) : message;

        if (!(ast && ast.type === 'messageFormatPattern')) {
            throw new TypeError('A message must be provided as a String or AST.');
        }

        // Creates a new object with the specified `formats` merged with the default
        // formats.
        formats = this._mergeFormats($$core$$MessageFormat.FORMATS, formats);

        // Defined first because it's used to build the format pattern.
        $$es5$$defineProperty(this, '_locale',  {value: this._resolveLocale(locales)});

        var pluralFn = $$core$$MessageFormat.__localeData__[this._locale].pluralFunction;

        // Define the `pattern` property, a compiled pattern that is highly
        // optimized for repeated `format()` invocations. **Note:** This passes the
        // `locales` set provided to the constructor instead of just the resolved
        // locale.
        var pattern = this._compilePattern(ast, locales, formats, pluralFn);
        $$es5$$defineProperty(this, '_pattern', {value: pattern});

        // Bind `format()` method to `this` so it can be passed by reference like
        // the other `Intl` APIs.
        this.format = $$es5$$fnBind.call(this.format, this);
    }

    // Default format options used as the prototype of the `formats` provided to the
    // constructor. These are used when constructing the internal Intl.NumberFormat
    // and Intl.DateTimeFormat instances.
    $$es5$$defineProperty($$core$$MessageFormat, 'FORMATS', {
        enumerable: true,

        value: {
            number: {
                'currency': {
                    style: 'currency'
                },

                'percent': {
                    style: 'percent'
                }
            },

            date: {
                'short': {
                    month: 'numeric',
                    day  : 'numeric',
                    year : '2-digit'
                },

                'medium': {
                    month: 'short',
                    day  : 'numeric',
                    year : 'numeric'
                },

                'long': {
                    month: 'long',
                    day  : 'numeric',
                    year : 'numeric'
                },

                'full': {
                    weekday: 'long',
                    month  : 'long',
                    day    : 'numeric',
                    year   : 'numeric'
                }
            },

            time: {
                'short': {
                    hour  : 'numeric',
                    minute: 'numeric'
                },

                'medium':  {
                    hour  : 'numeric',
                    minute: 'numeric',
                    second: 'numeric'
                },

                'long': {
                    hour        : 'numeric',
                    minute      : 'numeric',
                    second      : 'numeric',
                    timeZoneName: 'short'
                },

                'full': {
                    hour        : 'numeric',
                    minute      : 'numeric',
                    second      : 'numeric',
                    timeZoneName: 'short'
                }
            }
        }
    });

    // Define internal private properties for dealing with locale data.
    $$es5$$defineProperty($$core$$MessageFormat, '__availableLocales__', {value: []});
    $$es5$$defineProperty($$core$$MessageFormat, '__localeData__', {value: $$es5$$objCreate(null)});
    $$es5$$defineProperty($$core$$MessageFormat, '__addLocaleData', {value: function (data) {
        if (!(data && data.locale)) {
            throw new Error('Object passed does not identify itself with a valid language tag');
        }

        if (!data.messageformat) {
            throw new Error('Object passed does not contain locale data for IntlMessageFormat');
        }

        var availableLocales = $$core$$MessageFormat.__availableLocales__,
            localeData       = $$core$$MessageFormat.__localeData__;

        // Message format locale data only requires the first part of the tag.
        var locale = data.locale.toLowerCase().split('-')[0];

        availableLocales.push(locale);
        localeData[locale] = data.messageformat;
    }});

    // Defines `__parse()` static method as an exposed private.
    $$es5$$defineProperty($$core$$MessageFormat, '__parse', {value: intl$messageformat$parser$$default.parse});

    // Define public `defaultLocale` property which can be set by the developer, or
    // it will be set when the first MessageFormat instance is created by leveraging
    // the resolved locale from `Intl`.
    $$es5$$defineProperty($$core$$MessageFormat, 'defaultLocale', {
        enumerable: true,
        writable  : true,
        value     : undefined
    });

    $$es5$$defineProperty($$core$$MessageFormat, '__getDefaultLocale', {value: function () {
        if (!$$core$$MessageFormat.defaultLocale) {
            // Leverage the locale-resolving capabilities of `Intl` to determine
            // what the default locale should be.
            $$core$$MessageFormat.defaultLocale =
                    new Intl.NumberFormat().resolvedOptions().locale;
        }

        return $$core$$MessageFormat.defaultLocale;
    }});

    $$core$$MessageFormat.prototype.format = function (values) {
        return this._format(this._pattern, values);
    };

    $$core$$MessageFormat.prototype.resolvedOptions = function () {
        // TODO: Provide anything else?
        return {
            locale: this._locale
        };
    };

    $$core$$MessageFormat.prototype._compilePattern = function (ast, locales, formats, pluralFn) {
        var compiler = new $$compiler$$default(locales, formats, pluralFn);
        return compiler.compile(ast);
    };

    $$core$$MessageFormat.prototype._format = function (pattern, values) {
        var result = '',
            i, len, part, id, value;

        for (i = 0, len = pattern.length; i < len; i += 1) {
            part = pattern[i];

            // Exist early for string parts.
            if (typeof part === 'string') {
                result += part;
                continue;
            }

            id = part.id;

            // Enforce that all required values are provided by the caller.
            if (!(values && $$utils$$hop.call(values, id))) {
                throw new Error('A value must be provided for: ' + id);
            }

            value = values[id];

            // Recursively format plural and select parts' option — which can be a
            // nested pattern structure. The choosing of the option to use is
            // abstracted-by and delegated-to the part helper object.
            if (part.options) {
                result += this._format(part.getOption(value), values);
            } else {
                result += part.format(value);
            }
        }

        return result;
    };

    $$core$$MessageFormat.prototype._mergeFormats = function (defaults, formats) {
        var mergedFormats = {},
            type, mergedType;

        for (type in defaults) {
            if (!$$utils$$hop.call(defaults, type)) { continue; }

            mergedFormats[type] = mergedType = $$es5$$objCreate(defaults[type]);

            if (formats && $$utils$$hop.call(formats, type)) {
                $$utils$$extend(mergedType, formats[type]);
            }
        }

        return mergedFormats;
    };

    $$core$$MessageFormat.prototype._resolveLocale = function (locales) {
        var availableLocales = $$core$$MessageFormat.__availableLocales__,
            locale, parts, i, len;

        if (availableLocales.length === 0) {
            throw new Error('No locale data has been provided for IntlMessageFormat yet');
        }

        if (typeof locales === 'string') {
            locales = [locales];
        }

        if (locales && locales.length) {
            for (i = 0, len = locales.length; i < len; i += 1) {
                locale = locales[i].toLowerCase().split('-')[0];

                // Make sure the first part of the locale that we care about is
                // structurally valid.
                if (!/[a-z]{2,3}/i.test(locale)) {
                    throw new RangeError('"' + locales[i] + '" is not a structurally valid language tag');
                }

                if (availableLocales.indexOf(locale) >= 0) {
                    break;
                }
            }
        }

        return locale || $$core$$MessageFormat.__getDefaultLocale().split('-')[0];
    };
    var src$full$$default = $$core$$default;

    var src$full$$funcs = [
    function (n) {  },
    function (n) { n=Math.floor(n);if(n===1)return"one";return"other"; },
    function (n) { n=Math.floor(n);if(n>=0&&n<=1)return"one";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n));n=Math.floor(n);if(i===0||n===1)return"one";return"other"; },
    function (n) { n=Math.floor(n);if(n===0)return"zero";if(n===1)return"one";if(n===2)return"two";if(n%100>=3&&n%100<=10)return"few";if(n%100>=11&&n%100<=99)return"many";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;n=Math.floor(n);if(i===1&&v===0)return"one";return"other"; },
    function (n) { n=Math.floor(n);if(n%10===1&&(n%100!==11))return"one";if(n%10>=2&&n%10<=4&&!(n%100>=12&&n%100<=14))return"few";if(n%10===0||n%10>=5&&n%10<=9||n%100>=11&&n%100<=14)return"many";return"other"; },
    function (n) { return"other"; },
    function (n) { n=Math.floor(n);if(n%10===1&&!(n%100===11||n%100===71||n%100===91))return"one";if(n%10===2&&!(n%100===12||n%100===72||n%100===92))return"two";if((n%10>=3&&n%10<=4||n%10===9)&&!(n%100>=10&&n%100<=19||n%100>=70&&n%100<=79||n%100>=90&&n%100<=99))return"few";if((n!==0)&&n%1e6===0)return"many";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length,f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);n=Math.floor(n);if(v===0&&i%10===1&&((i%100!==11)||f%10===1&&(f%100!==11)))return"one";if(v===0&&i%10>=2&&i%10<=4&&(!(i%100>=12&&i%100<=14)||f%10>=2&&f%10<=4&&!(f%100>=12&&f%100<=14)))return"few";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;n=Math.floor(n);if(i===1&&v===0)return"one";if(i>=2&&i<=4&&v===0)return"few";if((v!==0))return"many";return"other"; },
    function (n) { n=Math.floor(n);if(n===0)return"zero";if(n===1)return"one";if(n===2)return"two";if(n===3)return"few";if(n===6)return"many";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),t=parseInt(n.toString().replace(/^[^.]*\.?|0+$/g,""),10);n=Math.floor(n);if(n===1||(t!==0)&&(i===0||i===1))return"one";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n));n=Math.floor(n);if(i===0||i===1)return"one";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length,f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);n=Math.floor(n);if(v===0&&(i===1||i===2||i===3||v===0&&(!(i%10===4||i%10===6||i%10===9)||(v!==0)&&!(f%10===4||f%10===6||f%10===9))))return"one";return"other"; },
    function (n) { n=Math.floor(n);if(n===1)return"one";if(n===2)return"two";if(n>=3&&n<=6)return"few";if(n>=7&&n<=10)return"many";return"other"; },
    function (n) { n=Math.floor(n);if(n===1||n===11)return"one";if(n===2||n===12)return"two";if(n>=3&&n<=10||n>=13&&n<=19)return"few";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;n=Math.floor(n);if(v===0&&i%10===1)return"one";if(v===0&&i%10===2)return"two";if(v===0&&(i%100===0||i%100===20||i%100===40||i%100===60||i%100===80))return"few";if((v!==0))return"many";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;n=Math.floor(n);if(i===1&&v===0)return"one";if(i===2&&v===0)return"two";if(v===0&&!(n>=0&&n<=10)&&n%10===0)return"many";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),t=parseInt(n.toString().replace(/^[^.]*\.?|0+$/g,""),10);n=Math.floor(n);if(t===0&&i%10===1&&((i%100!==11)||(t!==0)))return"one";return"other"; },
    function (n) { n=Math.floor(n);if(n===0)return"zero";if(n===1)return"one";return"other"; },
    function (n) { n=Math.floor(n);if(n===1)return"one";if(n===2)return"two";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n));n=Math.floor(n);if(n===0)return"zero";if((i===0||i===1)&&(n!==0))return"one";return"other"; },
    function (n) { var f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);n=Math.floor(n);if(n%10===1&&!(n%100>=11&&n%100<=19))return"one";if(n%10>=2&&n%10<=9&&!(n%100>=11&&n%100<=19))return"few";if((f!==0))return"many";return"other"; },
    function (n) { var v=n.toString().replace(/^[^.]*\.?/,"").length,f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);n=Math.floor(n);if(n%10===0||n%100>=11&&n%100<=19||v===2&&f%100>=11&&f%100<=19)return"zero";if(n%10===1&&((n%100!==11)||v===2&&f%10===1&&((f%100!==11)||(v!==2)&&f%10===1)))return"one";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length,f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);n=Math.floor(n);if(v===0&&(i%10===1||f%10===1))return"one";return"other"; },
    function (n) { n=Math.floor(n);if(n===1)return"one";if(n===0||n%100>=2&&n%100<=10)return"few";if(n%100>=11&&n%100<=19)return"many";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;n=Math.floor(n);if(i===1&&v===0)return"one";if(v===0&&i%10>=2&&i%10<=4&&!(i%100>=12&&i%100<=14))return"few";if(v===0&&(i!==1)&&(i%10>=0&&i%10<=1||v===0&&(i%10>=5&&i%10<=9||v===0&&i%100>=12&&i%100<=14)))return"many";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length,t=parseInt(n.toString().replace(/^[^.]*\.?|0+$/g,""),10);n=Math.floor(n);if(i===1&&(v===0||i===0&&t===1))return"one";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;n=Math.floor(n);if(i===1&&v===0)return"one";if((v!==0)||n===0||(n!==1)&&n%100>=1&&n%100<=19)return"few";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;n=Math.floor(n);if(v===0&&i%10===1&&(i%100!==11))return"one";if(v===0&&i%10>=2&&i%10<=4&&!(i%100>=12&&i%100<=14))return"few";if(v===0&&(i%10===0||v===0&&(i%10>=5&&i%10<=9||v===0&&i%100>=11&&i%100<=14)))return"many";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n));n=Math.floor(n);if(i===0||n===1)return"one";if(n>=2&&n<=10)return"few";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);n=Math.floor(n);if(n===0||n===1||i===0&&f===1)return"one";return"other"; },
    function (n) { var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;n=Math.floor(n);if(v===0&&i%100===1)return"one";if(v===0&&i%100===2)return"two";if(v===0&&(i%100>=3&&i%100<=4||(v!==0)))return"few";return"other"; },
    function (n) { n=Math.floor(n);if(n>=0&&n<=1||n>=11&&n<=99)return"one";return"other"; }
    ];
    $$core$$default.__addLocaleData({locale:"aa", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"af", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"agq", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"ak", messageformat:{pluralFunction:src$full$$funcs[2]}});
    $$core$$default.__addLocaleData({locale:"am", messageformat:{pluralFunction:src$full$$funcs[3]}});
    $$core$$default.__addLocaleData({locale:"ar", messageformat:{pluralFunction:src$full$$funcs[4]}});
    $$core$$default.__addLocaleData({locale:"as", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"asa", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ast", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"az", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"bas", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"be", messageformat:{pluralFunction:src$full$$funcs[6]}});
    $$core$$default.__addLocaleData({locale:"bem", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"bez", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"bg", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"bm", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"bn", messageformat:{pluralFunction:src$full$$funcs[3]}});
    $$core$$default.__addLocaleData({locale:"bo", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"br", messageformat:{pluralFunction:src$full$$funcs[8]}});
    $$core$$default.__addLocaleData({locale:"brx", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"bs", messageformat:{pluralFunction:src$full$$funcs[9]}});
    $$core$$default.__addLocaleData({locale:"byn", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"ca", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"cgg", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"chr", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"cs", messageformat:{pluralFunction:src$full$$funcs[10]}});
    $$core$$default.__addLocaleData({locale:"cy", messageformat:{pluralFunction:src$full$$funcs[11]}});
    $$core$$default.__addLocaleData({locale:"da", messageformat:{pluralFunction:src$full$$funcs[12]}});
    $$core$$default.__addLocaleData({locale:"dav", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"de", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"dje", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"dua", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"dyo", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"dz", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"ebu", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"ee", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"el", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"en", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"eo", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"es", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"et", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"eu", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ewo", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"fa", messageformat:{pluralFunction:src$full$$funcs[3]}});
    $$core$$default.__addLocaleData({locale:"ff", messageformat:{pluralFunction:src$full$$funcs[13]}});
    $$core$$default.__addLocaleData({locale:"fi", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"fil", messageformat:{pluralFunction:src$full$$funcs[14]}});
    $$core$$default.__addLocaleData({locale:"fo", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"fr", messageformat:{pluralFunction:src$full$$funcs[13]}});
    $$core$$default.__addLocaleData({locale:"fur", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"fy", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"ga", messageformat:{pluralFunction:src$full$$funcs[15]}});
    $$core$$default.__addLocaleData({locale:"gd", messageformat:{pluralFunction:src$full$$funcs[16]}});
    $$core$$default.__addLocaleData({locale:"gl", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"gsw", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"gu", messageformat:{pluralFunction:src$full$$funcs[3]}});
    $$core$$default.__addLocaleData({locale:"guz", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"gv", messageformat:{pluralFunction:src$full$$funcs[17]}});
    $$core$$default.__addLocaleData({locale:"ha", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"haw", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"he", messageformat:{pluralFunction:src$full$$funcs[18]}});
    $$core$$default.__addLocaleData({locale:"hi", messageformat:{pluralFunction:src$full$$funcs[3]}});
    $$core$$default.__addLocaleData({locale:"hr", messageformat:{pluralFunction:src$full$$funcs[9]}});
    $$core$$default.__addLocaleData({locale:"hu", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"hy", messageformat:{pluralFunction:src$full$$funcs[13]}});
    $$core$$default.__addLocaleData({locale:"ia", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"id", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"ig", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"ii", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"is", messageformat:{pluralFunction:src$full$$funcs[19]}});
    $$core$$default.__addLocaleData({locale:"it", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"ja", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"jgo", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"jmc", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ka", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"kab", messageformat:{pluralFunction:src$full$$funcs[13]}});
    $$core$$default.__addLocaleData({locale:"kam", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"kde", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"kea", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"khq", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"ki", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"kk", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"kkj", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"kl", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"kln", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"km", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"kn", messageformat:{pluralFunction:src$full$$funcs[3]}});
    $$core$$default.__addLocaleData({locale:"ko", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"kok", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"ks", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ksb", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ksf", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"ksh", messageformat:{pluralFunction:src$full$$funcs[20]}});
    $$core$$default.__addLocaleData({locale:"kw", messageformat:{pluralFunction:src$full$$funcs[21]}});
    $$core$$default.__addLocaleData({locale:"ky", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"lag", messageformat:{pluralFunction:src$full$$funcs[22]}});
    $$core$$default.__addLocaleData({locale:"lg", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"lkt", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"ln", messageformat:{pluralFunction:src$full$$funcs[2]}});
    $$core$$default.__addLocaleData({locale:"lo", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"lt", messageformat:{pluralFunction:src$full$$funcs[23]}});
    $$core$$default.__addLocaleData({locale:"lu", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"luo", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"luy", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"lv", messageformat:{pluralFunction:src$full$$funcs[24]}});
    $$core$$default.__addLocaleData({locale:"mas", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"mer", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"mfe", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"mg", messageformat:{pluralFunction:src$full$$funcs[2]}});
    $$core$$default.__addLocaleData({locale:"mgh", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"mgo", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"mk", messageformat:{pluralFunction:src$full$$funcs[25]}});
    $$core$$default.__addLocaleData({locale:"ml", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"mn", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"mr", messageformat:{pluralFunction:src$full$$funcs[3]}});
    $$core$$default.__addLocaleData({locale:"ms", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"mt", messageformat:{pluralFunction:src$full$$funcs[26]}});
    $$core$$default.__addLocaleData({locale:"mua", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"my", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"naq", messageformat:{pluralFunction:src$full$$funcs[21]}});
    $$core$$default.__addLocaleData({locale:"nb", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"nd", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ne", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"nl", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"nmg", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"nn", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"nnh", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"nr", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"nso", messageformat:{pluralFunction:src$full$$funcs[2]}});
    $$core$$default.__addLocaleData({locale:"nus", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"nyn", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"om", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"or", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"os", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"pa", messageformat:{pluralFunction:src$full$$funcs[2]}});
    $$core$$default.__addLocaleData({locale:"pl", messageformat:{pluralFunction:src$full$$funcs[27]}});
    $$core$$default.__addLocaleData({locale:"ps", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"pt", messageformat:{pluralFunction:src$full$$funcs[28]}});
    $$core$$default.__addLocaleData({locale:"rm", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"rn", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"ro", messageformat:{pluralFunction:src$full$$funcs[29]}});
    $$core$$default.__addLocaleData({locale:"rof", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ru", messageformat:{pluralFunction:src$full$$funcs[30]}});
    $$core$$default.__addLocaleData({locale:"rw", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"rwk", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"sah", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"saq", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"sbp", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"se", messageformat:{pluralFunction:src$full$$funcs[21]}});
    $$core$$default.__addLocaleData({locale:"seh", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ses", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"sg", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"shi", messageformat:{pluralFunction:src$full$$funcs[31]}});
    $$core$$default.__addLocaleData({locale:"si", messageformat:{pluralFunction:src$full$$funcs[32]}});
    $$core$$default.__addLocaleData({locale:"sk", messageformat:{pluralFunction:src$full$$funcs[10]}});
    $$core$$default.__addLocaleData({locale:"sl", messageformat:{pluralFunction:src$full$$funcs[33]}});
    $$core$$default.__addLocaleData({locale:"sn", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"so", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"sq", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"sr", messageformat:{pluralFunction:src$full$$funcs[9]}});
    $$core$$default.__addLocaleData({locale:"ss", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ssy", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"st", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"sv", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"sw", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"swc", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"ta", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"te", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"teo", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"tg", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"th", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"ti", messageformat:{pluralFunction:src$full$$funcs[2]}});
    $$core$$default.__addLocaleData({locale:"tig", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"tn", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"to", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"tr", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"ts", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"twq", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"tzm", messageformat:{pluralFunction:src$full$$funcs[34]}});
    $$core$$default.__addLocaleData({locale:"ug", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"uk", messageformat:{pluralFunction:src$full$$funcs[30]}});
    $$core$$default.__addLocaleData({locale:"ur", messageformat:{pluralFunction:src$full$$funcs[5]}});
    $$core$$default.__addLocaleData({locale:"uz", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"vai", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"ve", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"vi", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"vo", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"vun", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"wae", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"wal", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"xh", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"xog", messageformat:{pluralFunction:src$full$$funcs[1]}});
    $$core$$default.__addLocaleData({locale:"yav", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"yo", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"zgh", messageformat:{pluralFunction:src$full$$funcs[0]}});
    $$core$$default.__addLocaleData({locale:"zh", messageformat:{pluralFunction:src$full$$funcs[7]}});
    $$core$$default.__addLocaleData({locale:"zu", messageformat:{pluralFunction:src$full$$funcs[3]}});
    this['IntlMessageFormat'] = src$full$$default;
}).call(this);

//# sourceMappingURL=intl-messageformat.js.map