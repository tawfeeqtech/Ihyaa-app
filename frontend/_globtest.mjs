const escapedChars = new Set(["\\", "+", "(", ")", "|", "[", "]", "{", "}", ".", "^", "$", "*", "?"]);
function globToRegexPattern(glob) {
  const tokens = ["^"];
  let inGroup = false;
  for (let i = 0; i < glob.length; ++i) {
    const c = glob[i];
    if (c === "\\" && i + 1 < glob.length) {
      const char = glob[++i];
      tokens.push(escapedChars.has(char) ? "\\" + char : char);
      continue;
    }
    if (c === "*") {
      const charBefore = glob[i - 1];
      let starCount = 1;
      while (glob[i + 1] === "*") {
        starCount++;
        i++;
      }
      if (starCount > 1) {
        const charAfter = glob[i + 1];
        if (charAfter === "/") {
          if (charBefore === "/") tokens.push("((.+)/|)");
          else tokens.push("(.*/)");
          ++i;
        } else {
          tokens.push("(.*)");
        }
      } else {
        tokens.push("([^/]*)");
      }
      continue;
    }
    switch (c) {
      case "{":
        if (inGroup) throw new Error("nested");
        inGroup = true;
        tokens.push("(");
        break;
      case "}":
        if (!inGroup) throw new Error("unmatched");
        inGroup = false;
        tokens.push(")");
        break;
      case ",":
        if (inGroup) tokens.push("|");
        else tokens.push(c);
        break;
      default:
        tokens.push(escapedChars.has(c) ? "\\" + c : c);
    }
  }
  tokens.push("$");
  return new RegExp(tokens.join(""));
}

const pat = globToRegexPattern("**/api/notifications");
console.log("regex:", pat.toString());
console.log("with query:", pat.test("http://localhost:3000/api/notifications?page=1&per_page=20"));
console.log("no query:", pat.test("http://localhost:3000/api/notifications"));
console.log("recent:", pat.test("http://localhost:3000/api/notifications/recent"));
