// C strings (char arrays, <cstring>) and std::string question templates (C++98 .. C++17).
const { inc, NL } = require('./common');

const WORDS = ['banana', 'mississippi', 'abracadabra', 'balloon', 'committee', 'programming', 'compiler', 'template', 'iterator', 'pointer'];
const SMALL = ['hello', 'world', 'apple', 'cherry', 'string', 'buffer', 'vector', 'lambda', 'static', 'const'];
const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

module.exports = [
  // ---------------------------------------------------------------------------
  {
    id: 'cstr-sizeof-strlen', topic: 'C strings: sizeof vs strlen, arrays vs pointers', minStd: '98',
    build(R) {
      const w = R.pick(SMALL), n = w.length;
      const mode = R.int(0, 4);
      const difficulty = [1, 2, 2, 1, 2][mode];
      if (mode === 0) {
        return {
          kind: 'output', difficulty,
          code: `${inc('cstring', 'iostream')}int main() {\n    char s[] = "${w}";\n    const char* p = s;\n    std::cout << sizeof(s) << " " << std::strlen(s) << " " << sizeof(p) << "${NL}";\n}\n`,
          expected: `${n + 1} ${n} 8`,
          wrong: [`${n} ${n} 8`, `${n + 1} ${n + 1} 8`, `${n + 1} ${n} ${n + 1}`, `${n + 1} ${n} ${n}`],
          wrongWhy: ["sizeof(s) is the length plus the terminating NUL.", "strlen stops before the terminator, so it is the length.", "sizeof(p) is the size of a pointer (8), not of the string.", "p is a pointer: its sizeof does not depend on the string length."],
          explain: 'sizeof(s) is the size of the whole array, including the terminating \'\\0\' (length + 1). strlen counts the characters before the terminator. sizeof(p) is the size of a pointer (8 bytes on the x86-64 target used here), not of the string.',
        };
      }
      if (mode === 1) {
        const N = n + R.int(2, 8);
        return {
          kind: 'output', difficulty,
          code: `${inc('cstring', 'iostream')}int main() {\n    char s[${N}] = "${w}";\n    std::cout << sizeof(s) << " " << std::strlen(s) << "${NL}";\n}\n`,
          expected: `${N} ${n}`,
          wrong: [`${n + 1} ${n}`, `${N} ${N}`, `${N} ${n + 1}`, `${n} ${n}`],
          wrongWhy: ["sizeof is the whole array size N, not the literal's length plus one.", "strlen stops at the first NUL, not at the array size.", "strlen does not count the NUL terminator.", "sizeof(s) is the declared array size N."],
          explain: `The array has ${N} elements, so sizeof is ${N}; the rest is zero-filled after the literal. strlen stops at the first '\\0' and returns ${n}.`,
        };
      }
      if (mode === 2) {
        const [a, b] = [R.pick(['ab', 'abc', 'hey', 'xy']), R.pick(['cd', 'def', 'you', 'zq'])];
        return {
          kind: 'output', difficulty,
          code: `${inc('cstring', 'iostream')}int main() {\n    char s[] = "${a}\\0${b}";\n    std::cout << sizeof(s) << " " << std::strlen(s) << "${NL}";\n}\n`,
          expected: `${a.length + b.length + 2} ${a.length}`,
          wrong: [`${a.length + b.length + 1} ${a.length}`, `${a.length + b.length + 2} ${a.length + b.length}`, `${a.length + 1} ${a.length}`, `${a.length + b.length + 1} ${a.length + b.length}`],
          wrongWhy: ["The embedded NUL counts toward sizeof, plus the implicit final NUL.", "strlen stops at the first NUL, so it does not count the part after it.", "sizeof counts every element of the array, including both NULs.", "strlen stops at the embedded NUL; sizeof counts the whole array."],
          explain: `The literal "${a}\\0${b}" contains an embedded NUL: its array has ${a.length + b.length + 2} elements (${a.length} + 1 + ${b.length} + the implicit final NUL), but strlen stops at the first NUL, so it reports ${a.length}.`,
        };
      }
      if (mode === 3) {
        return {
          kind: 'output', difficulty,
          code: `${inc('cstring', 'iostream')}int main() {\n    std::cout << sizeof("${w}") << " " << std::strlen("${w}") << " " << sizeof(*"${w}") << "${NL}";\n}\n`,
          expected: `${n + 1} ${n} 1`,
          wrong: [`${n} ${n} 1`, `${n + 1} ${n} 8`, `${n + 1} ${n + 1} 1`, `8 ${n} 1`],
          wrongWhy: ["A string literal's type includes the NUL, so sizeof is the length plus 1.", "*\"lit\" is the first character: a char, of size 1, not a pointer.", "strlen does not count the terminator.", "sizeof of a literal is the array size, not the pointer size."],
          explain: `A string literal has type const char[${n + 1}] (including the NUL), so sizeof is ${n + 1}. strlen skips the terminator. *"${w}" decays to the first element, a char, so its size is 1.`,
        };
      }
      const N = R.int(4, 12), isInt = R.chance(0.5), T = isInt ? 'int' : 'char', sz = isInt ? 4 : 1;
      return {
        kind: 'output', difficulty,
        code: `${inc('iostream')}void f(${T} a[${N}]) {\n    std::cout << sizeof(a) << " ";\n}\n\nint main() {\n    ${T} a[${N}];\n    std::cout << sizeof(a) << " ";\n    f(a);\n    std::cout << "${NL}";\n}\n`,
        expected: `${N * sz} 8`,
        wrong: [`${N * sz} ${N * sz}`, `8 8`, `${N} 8`, `${N * sz} ${N}`],
        wrongWhy: ["A parameter declared as an array is really a pointer: sizeof(a) in f is 8.", "In main, a is a real array, so sizeof(a) is its full size in bytes.", "sizeof(a) in main is a number of bytes, not an element count.", "In f, sizeof(a) is the pointer size, not the number of elements."],
        explain: `Inside main, a is a real array of ${N} ${T}s: sizeof gives ${N * sz}. As a function parameter, "${T} a[${N}]" is adjusted to "${T}* a", so sizeof(a) there is the size of a pointer (8). The array size in the parameter is ignored.`,
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'cstr-functions', topic: '<cstring> functions (strcpy, strcat, strncpy, strcmp, strchr, strstr)', minStd: '98',
    build(R) {
      const mode = R.int(0, 3);
      if (mode === 0) {
        const parts = R.sample(SMALL, R.int(2, 3));
        const full = parts.join('');
        return {
          kind: 'output',
          code: `${inc('cstring', 'iostream')}int main() {\n    char buf[64] = "";\n    std::strcpy(buf, "${parts[0]}");\n${parts.slice(1).map((p) => `    std::strcat(buf, "${p}");`).join('\n')}\n    std::cout << buf << " " << std::strlen(buf) << "${NL}";\n}\n`,
          expected: `${full} ${full.length}`,
          wrong: [`${parts[parts.length - 1]} ${parts[parts.length - 1].length}`, `${full} ${full.length + 1}`, `${parts[0]} ${full.length}`],
          wrongWhy: ["strcpy replaces the contents and strcat appends: the result is the concatenation of all the parts.", "strlen does not count the terminator.", "strcat appends the later parts too; the result is not only the first part."],
          explain: 'strcpy overwrites the buffer with the first string (and its NUL); each strcat appends after the current terminating NUL. The result is the concatenation, and strlen counts all its characters.',
        };
      }
      if (mode === 1) {
        const w = R.pick(SMALL), k = R.int(2, w.length - 1);
        return {
          kind: 'output',
          code: `${inc('cstring', 'iostream')}int main() {\n    char buf[16] = {};\n    std::strncpy(buf, "${w}", ${k});\n    std::cout << buf << " " << std::strlen(buf) << "${NL}";\n}\n`,
          expected: `${w.slice(0, k)} ${k}`,
          wrong: [`${w} ${w.length}`, `${w.slice(0, k)} ${w.length}`, `${w.slice(0, k + 1)} ${k + 1}`, `${w.slice(1, k + 1)} ${k}`],
          wrongWhy: ["strncpy copies at most n characters, so the result is truncated.", "strlen counts only the characters actually copied.", "n characters means exactly n, not n + 1.", "The copy starts at the beginning of the string, not at index 1."],
          explain: `strncpy copies at most ${k} characters. Because the source is longer than ${k}, it does NOT append a NUL; here the buffer was zero-initialised ({}), so the result happens to be terminated. (Without that initialisation, the output would be undefined behavior.)`,
        };
      }
      if (mode === 2) {
        const pairs = [['apple', 'apple'], ['apple', 'apples'], ['Zoo', 'apple'], ['abc', 'abd'], ['banana', 'Banana'], ['10', '9'], ['', 'a'], ['cat', 'car'], ['same', 'same']];
        const chosen = R.sample(pairs, R.int(2, 3));
        const exp = chosen.map(([a, b]) => cmp(a, b));
        return {
          kind: 'output',
          code: `${inc('cstring', 'iostream')}int sgn(int v) { return (v > 0) - (v < 0); }\n\nint main() {\n${chosen.map(([a, b]) => `    std::cout << sgn(std::strcmp("${a}", "${b}")) << " ";`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
          expected: exp.join(' '),
          wrong: [exp.map((e) => -e).join(' '), exp.map((e) => (e === 0 ? 1 : 0)).join(' '), exp.map((e) => (e === 0 ? 0 : -e)).join(' ')],
          wrongWhy: ["The sign is reversed: strcmp returns a positive value when the first string is greater.", "0 means the strings are equal; any difference gives a non-zero result.", "The first differing byte decides the sign (uppercase letters sort before lowercase)."],
          explain: 'strcmp compares the strings byte by byte as unsigned chars (so \'Z\' (90) < \'a\' (97), and "10" < "9"). A proper prefix compares less than the longer string. It returns <0, 0 or >0; the helper normalises the sign.',
        };
      }
      const w = R.pick(WORDS);
      const c = R.pick(w.split('')), subLen = R.int(2, 3), st = R.int(0, w.length - subLen), sub = w.substr(st, subLen);
      const items = [
        [`std::strchr(s, '${c}') - s`, w.indexOf(c), 'strchr returns a pointer to the FIRST occurrence; subtracting s gives its index'],
        [`std::strrchr(s, '${c}') - s`, w.lastIndexOf(c), 'strrchr returns a pointer to the LAST occurrence'],
        [`std::strstr(s, "${sub}") - s`, w.indexOf(sub), 'strstr returns a pointer to the first occurrence of the substring'],
        [`std::strlen(std::strchr(s, '${c}'))`, w.length - w.indexOf(c), 'strchr returns the tail starting at the first match, so strlen of it is the remaining length'],
      ];
      const picks = R.sample(items, 3);
      return {
        kind: 'output',
        code: `${inc('cstring', 'iostream')}int main() {\n    const char* s = "${w}";\n    std::cout << ${picks.map((p) => `(${p[0]})`).join(' << " " << ')} << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => p[1] + 1).join(' '), picks.map((p) => Math.max(0, p[1] - 1)).join(' '), picks.map((p, i) => (i === 0 ? p[1] + 1 : p[1])).join(' ')],
        wrongWhy: ["These are 0-based offsets from the start of the string.", "strchr finds the FIRST occurrence, strrchr the last.", "Each pointer subtraction gives a 0-based index, not a 1-based position."],
        explain: `Searching "${w}": ` + picks.map((p) => p[2]).join('; ') + '.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'char-expressions', topic: 'char arithmetic, literals and pointer arithmetic on strings', minStd: '98',
    build(R) {
      const w = R.pick(SMALL), n = w.length;
      const c = R.pick('abcdefgh'.split('')), k = R.int(1, 4), i = R.int(1, n - 1);
      const items = [
        [`'${c}' + ${k}`, String(c.charCodeAt(0) + k), 'arithmetic on a char promotes it to int, so the result is the character code, not a letter'],
        [`static_cast<char>('${c}' + ${k})`, String.fromCharCode(c.charCodeAt(0) + k), 'casting the int result back to char prints the letter'],
        [`"${w}"[${i}]`, w[i], 'indexing a string literal yields the char at that position'],
        [`*("${w}" + ${i})`, w[i], 'pointer arithmetic then dereference is the same as indexing'],
        [`"${w}" + ${i}`, w.slice(i), 'adding an integer to a const char* moves the start of the string, so cout prints the remaining suffix'],
        ["sizeof('a')", '1', 'in C++ a character literal has type char (in C it would be int, 4)'],
        [`'${w[0]}' < '${w[i]}'`, w[0] < w[i] ? '1' : '0', 'characters compare by code, and a bool prints as 1 or 0'],
        [`'${w[i]}' - '${w[0]}'`, String(w.charCodeAt(i) - w.charCodeAt(0)), 'subtracting characters gives the difference of their codes as an int'],
        ["'7' - '0'", '7', 'the digit characters are contiguous, so this converts a digit character to its value'],
      ];
      const picks = R.sample(items, 3);
      const exp = picks.map((p) => p[1]);
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    std::cout << ${picks.map((p) => `(${p[0]})`).join(' << " " << ')} << "${NL}";\n}\n`,
        expected: exp.join(' '),
        wrong: [picks.map((p) => (/^-?\d+$/.test(p[1]) ? String(Number(p[1]) + 1) : p[1].slice(1) || 'a')).join(' '), picks.map((p) => (/^-?\d+$/.test(p[1]) && p[0].startsWith("'") ? String.fromCharCode(Number(p[1])) : p[1])).join(' '), picks.map((p, idx) => (idx === 2 ? p[1] + p[1] : p[1])).join(' ')],
        wrongWhy: ["Arithmetic on a char yields an int, which prints as a number; a cast brings back the letter.", "A cast to char prints the letter, otherwise the number.", "Indexing and pointer arithmetic on a literal give a single char or the remaining suffix."],
        explain: picks.map((p) => `${p[0]}: ${p[2]}.`).join(' '),
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'string-ctors', topic: 'std::string constructors & substr', minStd: '98',
    build(R) {
      const w = R.pick(WORDS), n = w.length;
      const p = R.int(1, 3), q = R.int(1, 3), cnt = R.int(2, 4), c = R.pick('xyz*#'.split(''));
      const items = [
        [`std::string(${cnt}, '${c}')`, c.repeat(cnt)],
        [`std::string("${w}", ${cnt})`, w.slice(0, cnt)],
        [`std::string(w, ${p})`, w.slice(p)],
        [`std::string(w, ${p}, ${cnt})`, w.substr(p, cnt)],
        ['std::string(w.rbegin(), w.rend())', w.split('').reverse().join('')],
        [`std::string(w.begin() + ${p}, w.end() - ${q})`, w.slice(p, n - q)],
        [`w.substr(${p})`, w.slice(p)],
        [`w.substr(${p}, ${cnt})`, w.substr(p, cnt)],
        [`w.substr(w.size() - ${cnt})`, w.slice(n - cnt)],
      ];
      const picks = R.sample(items, 3);
      const exp = picks.map((x) => x[1]);
      return {
        kind: 'output',
        code: `${inc('iostream', 'string')}int main() {\n    std::string w = "${w}";\n    std::cout << ${picks.map((x) => x[0]).join(' << "|" << ')} << "${NL}";\n}\n`,
        expected: exp.join('|'),
        wrong: [[...exp].reverse().join('|'), picks.map((x, i) => (i === 0 ? x[1].slice(1) || x[1] + '!' : x[1])).join('|'), picks.map((x, i) => (i === 2 ? w.slice(0, x[1].length) : x[1])).join('|')],
        wrongWhy: ["The three strings are printed in the order of the expressions.", "string(count, ch) repeats the character, string(str, n) takes the first n characters, substr(pos, n) starts at pos.", "Iterator ranges are half-open, and string(str, pos) copies from pos to the end."],
        explain: 'string(count, ch) fills; string(const char*, n) takes the first n characters; string(str, pos) copies from pos to the end; string(str, pos, n) / substr(pos, n) copy up to n characters starting at pos; iterator ranges are half-open [first, last); reverse iterators build the reversed string.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'string-find', topic: 'std::string searching (find, rfind, find_first_of ...)', minStd: '98',
    build(R) {
      const w = R.pick(WORDS), n = w.length;
      const c = R.pick(w.split('')), st = R.int(1, n - 2);
      const setChars = R.sample(['a', 'e', 'i', 'o', 'u', 'm', 'n', 'p', 's'], 3).join('');
      const firstOf = (s, set) => { for (let i = 0; i < s.length; i++) if (set.includes(s[i])) return i; return -1; };
      const lastOf = (s, set) => { for (let i = s.length - 1; i >= 0; i--) if (set.includes(s[i])) return i; return -1; };
      const firstNot = (s, set) => { for (let i = 0; i < s.length; i++) if (!set.includes(s[i])) return i; return -1; };
      const sub = w.substr(R.int(0, n - 2), 2);
      const items = [
        [`idx(s.find('${c}'))`, w.indexOf(c), 'find returns the index of the first match'],
        [`idx(s.find('${c}', ${st}))`, w.indexOf(c, st), `find with a start position ignores everything before index ${st}`],
        [`idx(s.rfind('${c}'))`, w.lastIndexOf(c), 'rfind searches from the end and returns the last match'],
        [`idx(s.find("${sub}"))`, w.indexOf(sub), 'find with a string returns the start of the first occurrence'],
        [`idx(s.find('#'))`, -1, 'a missing character gives std::string::npos, which idx() maps to -1'],
        [`idx(s.find_first_of("${setChars}"))`, firstOf(w, setChars), 'find_first_of returns the first position holding ANY of the listed characters'],
        [`idx(s.find_last_of("${setChars}"))`, lastOf(w, setChars), 'find_last_of returns the last position holding any of the listed characters'],
        [`idx(s.find_first_not_of("${setChars}"))`, firstNot(w, setChars), 'find_first_not_of returns the first position holding a character NOT in the set'],
      ];
      const picks = R.sample(items, 3);
      return {
        kind: 'output',
        code: `${inc('iostream', 'string')}int idx(std::string::size_type p) { return p == std::string::npos ? -1 : static_cast<int>(p); }\n\nint main() {\n    std::string s = "${w}";\n    std::cout << ${picks.map((p) => p[0]).join(' << " " << ')} << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => p[1] + 1).join(' '), picks.map((p) => (p[1] === -1 ? 0 : p[1] - 1)).join(' '), picks.map((p, i) => (i === 0 ? (p[1] === -1 ? 0 : -1) : p[1])).join(' ')],
        wrongWhy: ["Indices are 0-based; find returns the position of the first match.", "rfind searches from the end, find from the start; npos prints as -1 through idx().", "find_first_of and find_first_not_of work on a set of characters, not a substring."],
        explain: `Searching "${w}" (0-based indices): ` + picks.map((p) => p[2]).join('; ') + '.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'string-modify', topic: 'std::string modification (insert, erase, replace, append)', minStd: '98',
    build(R) {
      const start = R.pick(SMALL);
      let s = start;
      const lines = [];
      const n = R.int(2, 3);
      while (lines.length < n) {
        const op = R.pick(['insert', 'insertN', 'erase', 'eraseTail', 'replace', 'append', 'appendN']);
        if (op === 'insert') { const p = R.int(0, s.length), t = R.pick(['XY', '--', 'ab']); lines.push(`    s.insert(${p}, "${t}");`); s = s.slice(0, p) + t + s.slice(p); }
        else if (op === 'insertN') { const p = R.int(0, s.length), k = R.int(2, 3), c = R.pick(['*', '!', '_']); lines.push(`    s.insert(${p}, ${k}, '${c}');`); s = s.slice(0, p) + c.repeat(k) + s.slice(p); }
        else if (op === 'erase' && s.length > 3) { const p = R.int(0, s.length - 2), k = R.int(1, 3); lines.push(`    s.erase(${p}, ${k});`); s = s.slice(0, p) + s.slice(p + k); }
        else if (op === 'eraseTail' && s.length > 3) { const p = R.int(1, s.length - 2); lines.push(`    s.erase(${p});`); s = s.slice(0, p); }
        else if (op === 'replace') { const p = R.int(0, s.length - 1), k = R.int(1, 3), t = R.pick(['Z', 'ZZZ', 'pq']); lines.push(`    s.replace(${p}, ${k}, "${t}");`); s = s.slice(0, p) + t + s.slice(p + k); }
        else if (op === 'appendN') { const k = R.int(2, 3), c = R.pick(['.', '+', '=']); lines.push(`    s.append(${k}, '${c}');`); s += c.repeat(k); }
        else if (op === 'append') { const t = R.pick(['!', '++', '.cpp']); lines.push(`    s += "${t}";`); s += t; }
      }
      return {
        kind: 'output',
        code: `${inc('iostream', 'string')}int main() {\n    std::string s = "${start}";\n${lines.join('\n')}\n    std::cout << s << " " << s.size() << "${NL}";\n}\n`,
        expected: `${s} ${s.length}`,
        wrong: [`${s} ${s.length + 1}`, `${s} ${s.length - 1}`, `${start} ${start.length}`, `${s.slice(1)} ${s.length - 1}`],
        wrongWhy: ["size() is exactly the number of characters after all the operations.", "size() counts every character; replace may change the length.", "The operations modify s, so the original word is not what gets printed.", "Replay the operations in order: the first character changes only if an operation touches index 0."],
        explain: 'Replay the operations on the string one by one. insert(pos, str) / insert(pos, n, ch) add text before index pos; erase(pos, n) removes up to n characters (erase(pos) removes everything from pos); replace(pos, n, str) swaps the n characters starting at pos for str, whatever its length; += and append(n, ch) add at the end.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'string-compare', topic: 'std::string comparison', minStd: '98',
    build(R) {
      const pairs = [['apple', 'apple'], ['apple', 'Apple'], ['app', 'apple'], ['Zebra', 'apple'], ['abc', 'abd'], ['10', '9'], ['', 'a'], ['hello', 'help'], ['cat', 'Cat'], ['same', 'same']];
      const [a, b] = R.pick(pairs);
      const items = [
        ['(a < b)', a < b ? '1' : '0', 'operator< compares lexicographically by character code'],
        ['(a == b)', a === b ? '1' : '0', 'operator== is true only for identical contents (case matters)'],
        ['(a > b)', a > b ? '1' : '0', 'operator> is the mirror of <'],
        ['sgn(a.compare(b))', String(cmp(a, b)), 'compare returns <0, 0 or >0 (the helper reduces it to -1/0/1)'],
        ['(a <= b)', a <= b ? '1' : '0', 'operator<= is true for less or equal'],
        [`(a == "${a}")`, '1', 'comparing a std::string with a C string compares contents, not addresses'],
        ['(a.size() < b.size())', a.length < b.length ? '1' : '0', 'size() comparisons look only at lengths'],
      ];
      const picks = R.sample(items, 3);
      return {
        kind: 'output',
        code: `${inc('iostream', 'string')}int sgn(int v) { return (v > 0) - (v < 0); }\n\nint main() {\n    std::string a = "${a}";\n    std::string b = "${b}";\n    std::cout << ${picks.map((p) => p[0]).join(' << " " << ')} << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => (p[0].startsWith('sgn') ? String(-Number(p[1])) : p[1] === '1' ? '0' : '1')).join(' '), picks.map((p, i) => (i === 0 ? (p[1] === '1' ? '0' : '1') : p[1])).join(' '), picks.map((p) => (p[0].startsWith('sgn') ? (p[1] === '0' ? '1' : '0') : p[1])).join(' ')],
        wrongWhy: ["Uppercase letters sort before lowercase in ASCII, and a proper prefix is less than the longer string.", "Check each comparison separately: == is true only for identical text.", "compare returns a negative, zero or positive value."],
        explain: `For a = "${a}" and b = "${b}": ` + picks.map((p) => `${p[0]} -> ${p[2]}`).join('; ') + '. Uppercase letters sort before lowercase (ASCII), digits sort as characters ("10" < "9"), and a proper prefix is less than the longer string.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'string-equality-identity', topic: 'Equality vs identity: arrays, C strings and std::string', minStd: '98',
    build(R) {
      const w = R.pick(SMALL);
      const items = [
        ['(a1 == a2)', '0', 'two distinct char arrays decay to pointers to different objects, so == compares addresses (false) even though the text is the same'],
        ['(std::strcmp(a1, a2) == 0)', '1', 'strcmp compares the characters, which are identical'],
        ['(s1 == s2)', '1', 'std::string::operator== compares contents'],
        ['(s1.c_str() == s2.c_str())', '0', 'each string owns its own buffer, so the two pointers differ'],
        [`(s1 == "${w}")`, '1', 'operator==(const std::string&, const char*) compares contents'],
        [`(s1.c_str() == s1.c_str())`, '1', 'c_str() on the same unmodified string returns the same pointer'],
        ['(s1.data() == s2.data())', '0', 'distinct strings have distinct buffers'],
      ];
      const picks = R.sample(items, 3);
      return {
        kind: 'output',
        code: `${inc('cstring', 'iostream', 'string')}int main() {\n    char a1[] = "${w}";\n    char a2[] = "${w}";\n    std::string s1 = "${w}";\n    std::string s2 = "${w}";\n    std::cout << ${picks.map((p) => p[0]).join(' << " " << ')} << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => (p[1] === '1' ? '0' : '1')).join(' '), picks.map((p, i) => (i === 0 ? (p[1] === '1' ? '0' : '1') : p[1])).join(' '), picks.map((p, i) => (i === 1 ? (p[1] === '1' ? '0' : '1') : p[1])).join(' ')],
        wrongWhy: ["Comparing char arrays with == compares addresses; std::string == compares contents.", "c_str() of different strings gives different pointers, of the same string the same pointer.", "strcmp and std::string::operator== compare contents, which are equal here."],
        explain: picks.map((p) => `${p[0]}: ${p[2]}.`).join(' '),
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'string-concat-compile', topic: 'std::string & char* conversions and operator+', minStd: '98', kind: 'compile',
    build(R) {
      const ERR = /invalid operands|conversion from|cannot convert|invalid conversion|no match|could not convert|no viable|no operator|invalid initialization/i;
      const pre = '#include <iostream>\n#include <string>\n\nint main() {\n';
      const post = '    std::cout << s << "\\n";\n}\n';
      const cases = [
        { ok: true, body: '    std::string s = std::string("a") + "b";\n', why: 'operator+(std::string, const char*) exists, so one std::string operand is enough.' },
        { ok: true, body: '    std::string s = "a" + std::string("b");\n', why: 'operator+(const char*, const std::string&) exists, so the std::string can be on the right.' },
        { ok: true, body: '    std::string s = "ab" "cd";\n', why: 'Adjacent string literals are concatenated by the compiler into one literal.' },
        { ok: true, body: '    std::string s("a");\n    s += \'b\';\n    s += "cd";\n', why: 'operator+= accepts a char and a C string.' },
        { ok: true, body: '    std::string t = "x";\n    std::string s = t + "y" + "z";\n', why: 'The leftmost + produces a std::string, so each following + has a std::string operand.' },
        { ok: true, body: '    char c = \'a\';\n    std::string s = std::string(1, c) + \'b\';\n', why: 'std::string(1, c) builds a one-character string, and + accepts a char on the right.' },
        { ok: true, body: '    std::string t = "abc";\n    const char* p = t.c_str();\n    std::string s = p;\n', why: 'c_str() gives a const char*, which converts implicitly (non-explicit constructor) back to std::string.' },
        { ok: false, body: '    std::string s = "a" + "b";\n', why: 'Both operands are string literals (const char[2] decaying to const char*): pointers cannot be added, and no operand is a std::string, so the overloaded operator+ is not considered.' },
        { ok: false, body: '    std::string t = "z";\n    std::string s = "x" + "y" + t;\n', why: '"x" + "y" is evaluated first and tries to add two pointers: error. Only the final + involves a std::string.' },
        { ok: false, body: '    std::string s = \'a\';\n', why: 'std::string has no constructor taking a single char, so copy-initialisation from a char does not compile (std::string(1, \'a\') would).' },
        { ok: false, body: '    std::string s = 65;\n', why: 'There is no implicit conversion from an integer to std::string.' },
        { ok: false, body: '    std::string s = \'a\' + \'b\';\n', why: '\'a\' + \'b\' is an int (195), and an int does not convert to std::string.' },
        { ok: false, body: '    std::string t = "abc";\n    const char* p = t;\n    std::string s = p;\n', why: 'std::string does not convert implicitly to const char*; you must call c_str() or data().' },
        { ok: false, body: '    std::string s = std::string("abc") - "b";\n', why: 'std::string defines no operator-.' },
      ];
      const c = R.pick(cases);
      return { kind: 'compile', code: pre + c.body + post, expected: c.ok ? 'ok' : 'error', errorRe: c.ok ? null : ERR, explain: c.why };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'string-conversions', topic: 'to_string / stoi / stod', minStd: '11',
    build(R) {
      const n = R.int(10, 99), d = (R.int(1, 99) / 4);
      const hex = n.toString(16), bin = n.toString(2);
      const dd = [['1.5e2', 150], ['2.5e1', 25], ['0.25e1', 2.5], ['3.5e0', 3.5]];
      const [dstr, dval] = R.pick(dd);
      const items = [
        [`std::to_string(${n})`, String(n), 'to_string converts the integer to its decimal text'],
        [`std::to_string(${d.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')})`, d.toFixed(6), 'to_string(double) always uses "%f" formatting: six digits after the decimal point'],
        [`std::stoi("${n}abc")`, String(n), 'stoi parses the leading number and stops at the first non-digit'],
        [`std::stoi("  ${n}")`, String(n), 'stoi skips leading whitespace'],
        [`std::stoi("${hex}", nullptr, 16)`, String(n), `base 16: "${hex}" is ${n}`],
        [`std::stoi("${bin}", nullptr, 2)`, String(n), `base 2: "${bin}" is ${n}`],
        [`std::stod("${dstr}")`, String(dval), 'stod understands scientific notation; cout prints the double with default precision'],
        ['safe("abc")', '-1', 'no digits to convert: stoi throws std::invalid_argument, which safe() maps to -1'],
        ['safe("99999999999")', '-2', 'the value does not fit in int: stoi throws std::out_of_range, mapped to -2'],
        [`safe("-${n}")`, String(-n), 'a leading minus sign is part of the number'],
      ];
      const picks = R.sample(items, 3);
      return {
        kind: 'output',
        code: `${inc('iostream', 'stdexcept', 'string')}int safe(const std::string& s) {\n    try {\n        return std::stoi(s);\n    } catch (const std::invalid_argument&) {\n        return -1;\n    } catch (const std::out_of_range&) {\n        return -2;\n    }\n}\n\nint main() {\n    std::cout << ${picks.map((p) => p[0]).join(' << " " << ')} << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => (/^-?\d+$/.test(p[1]) ? String(Number(p[1]) + 1) : p[1].replace(/0+$/, '').replace(/\.$/, '') || '0')).join(' '), picks.map((p, i) => (i === 0 ? (/^-?\d+$/.test(p[1]) ? String(-Number(p[1])) : p[1].slice(0, -1)) : p[1])).join(' '), picks.map((p, i) => (i === 1 ? (/^-?\d+$/.test(p[1]) ? String(Number(p[1]) * 10) : p[1].replace(/0+$/, '')) : p[1])).join(' ')],
        wrongWhy: ["stoi stops at the first non-digit and skips leading whitespace; to_string(double) always prints six decimals.", "The base argument selects how the digits are interpreted.", "A leading minus sign is part of the number."],
        explain: picks.map((p) => `${p[0]}: ${p[2]}.`).join(' '),
      };
    },
  },


  // ── container operations (moved from tgaps.js) ────────────────────────────────────
  {
      id: 'vector-erase-patterns', topic: 'Container modification: erase / remove / insert idioms', minStd: '98',
      build(R) {
        const mode = R.int(0, 4);
        const n = R.int(6, 8);
        const v = R.ints(n, 1, 20);
        const vecInit = `int a[] = {${v.join(', ')}};\n    std::vector<int> v(a, a + ${n});`;
        const show = 'for (std::vector<int>::iterator it = v.begin(); it != v.end(); ++it) std::cout << *it << " ";';
        if (mode === 0) {
          const k = R.pick([2, 3, 4]);
          const res = v.filter((x) => x % k !== 0);
          return {
            kind: 'output',
            code: `${inc('iostream', 'vector')}int main() {\n    ${vecInit}\n    for (std::vector<int>::iterator it = v.begin(); it != v.end();) {\n        if (*it % ${k} == 0) it = v.erase(it);\n        else ++it;\n    }\n    ${show}\n    std::cout << v.size() << "${NL}";\n}\n`,
            expected: `${res.join(' ')} ${res.length}`,
            wrong: [`${v.filter((x) => x % k === 0).join(' ')} ${v.filter((x) => x % k === 0).length}`, `${v.join(' ')} ${n}`, `${v.filter((x, i, arr) => !(x % k === 0 && !(i > 0 && arr[i - 1] % k === 0))).join(' ')} ${v.filter((x, i, arr) => !(x % k === 0 && !(i > 0 && arr[i - 1] % k === 0))).length}`],
            wrongWhy: ['This keeps the elements the loop removes; the condition erases multiples of ' + k + '.', 'erase() really removes the element and shrinks the vector.', 'erase(it) returns the iterator to the NEXT element, so the loop does not skip any element after an erase.'],
            explain: `The idiom "it = v.erase(it)" erases the current element and continues from the element that followed it (without incrementing), so every multiple of ${k} is removed, none is skipped, and the size shrinks accordingly.`,
          };
        }
        if (mode === 1) {
          const val = R.pick(v);
          const kept = v.filter((x) => x !== val);
          return {
            kind: 'output',
            code: `${inc('algorithm', 'iostream', 'vector')}int main() {\n    ${vecInit}\n    std::vector<int>::iterator e = std::remove(v.begin(), v.end(), ${val});\n    std::cout << v.size() << " " << (e - v.begin());\n    for (std::vector<int>::iterator it = v.begin(); it != e; ++it) std::cout << " " << *it;\n    std::cout << "${NL}";\n}\n`,
            expected: `${n} ${kept.length}${kept.length ? ' ' + kept.join(' ') : ''}`,
            wrong: [`${kept.length} ${kept.length}${kept.length ? ' ' + kept.join(' ') : ''}`, `${n} ${n}${' ' + v.join(' ')}`, `${n} ${kept.length}${kept.length ? ' ' + [...kept].reverse().join(' ') : ''}`],
            wrongWhy: ['std::remove only moves the kept elements forward and returns the new logical end; it never changes the container\'s size() (that needs erase).', 'The returned iterator marks the end of the kept range, so it is NOT the end of the vector when elements were removed.', 'remove is stable: the kept elements retain their relative order.'],
            explain: `std::remove shifts the elements that are not ${val} to the front (keeping their order) and returns the new logical end, but it cannot shrink the vector, so size() is still ${n}. The erase-remove idiom v.erase(std::remove(...), v.end()) is what actually shrinks it.`,
          };
        }
        if (mode === 2) {
          const kept = v.filter((x) => x % 2 === 0);
          return {
            kind: 'output',
            code: `${inc('algorithm', 'iostream', 'vector')}bool isOdd(int x) { return x % 2 != 0; }\n\nint main() {\n    ${vecInit}\n    v.erase(std::remove_if(v.begin(), v.end(), isOdd), v.end());\n    ${show}\n    std::cout << v.size() << "${NL}";\n}\n`,
            expected: `${kept.join(' ')} ${kept.length}`.trim(),
            wrong: [`${v.filter((x) => x % 2 === 1).join(' ')} ${v.filter((x) => x % 2 === 1).length}`.trim(), `${v.join(' ')} ${n}`, `${kept.join(' ')} ${n}`.trim()],
            wrongWhy: ['remove_if removes the elements for which the predicate is TRUE (the odd ones), keeping the evens.', 'The erase call after remove_if really deletes the leftover tail, so the vector shrinks.', 'After erase, size() reflects the removed elements; it is not the original size.'],
            explain: 'remove_if moves the elements that do NOT satisfy the predicate to the front; erase then chops off the leftover tail. Together (the erase-remove idiom) they delete all odd elements and shrink the vector.',
          };
        }
        if (mode === 3) {
          const l = R.ints(5, 1, 30), kIdx = R.int(0, 1), jIdx = R.int(2, 4);
          const rest = l.filter((_, i) => i !== kIdx);
          return {
            kind: 'output',
            code: `${inc('iostream', 'iterator', 'list')}int main() {\n    int a[] = {${l.join(', ')}};\n    std::list<int> l(a, a + 5);\n    std::list<int>::iterator p = l.begin();\n    std::advance(p, ${kIdx});\n    std::list<int>::iterator q = l.begin();\n    std::advance(q, ${jIdx});\n    l.erase(p);\n    std::cout << *q << " " << l.size() << " " << *l.begin() << "${NL}";\n}\n`,
            expected: `${l[jIdx]} 4 ${rest[0]}`,
            wrong: [`${rest[jIdx - 1]} 4 ${rest[0]}`, `${l[jIdx]} 5 ${rest[0]}`, `${l[jIdx]} 4 ${l[0]}`],
            wrongWhy: ['Erasing one list node does not move or renumber the others: q still refers to the same element.', 'erase really removes the node, so size() drops by one.', kIdx === 0 ? 'The first element was erased, so begin() is now the former second element.' : 'The first element was not erased, so begin() still refers to the same element.'],
            explain: 'std::list nodes are independent: erasing one invalidates only iterators to that element, so q still refers to the same value. Only the erased element disappears (size 5 -> 4).',
          };
        }
        const pos = R.int(0, n), cnt = R.int(2, 3), x = R.int(50, 99);
        const useCount = R.chance(0.5);
        const res = [...v]; res.splice(pos, 0, ...(useCount ? Array(cnt).fill(x) : [x]));
        return {
          kind: 'output',
          code: `${inc('iostream', 'vector')}int main() {\n    ${vecInit}\n    v.insert(v.begin() + ${pos}, ${useCount ? `${cnt}, ${x}` : x});\n    ${show}\n    std::cout << v.size() << "${NL}";\n}\n`,
          expected: `${res.join(' ')} ${res.length}`,
          wrong: [(() => { const r = [...v]; r.splice(Math.min(pos + 1, n), 0, ...(useCount ? Array(cnt).fill(x) : [x])); return `${r.join(' ')} ${r.length}`; })(), (() => { const r = [...v]; r.splice(pos, 0, x); return `${r.join(' ')} ${r.length}`; })(), `${v.join(' ')} ${res.length}`],
          wrongWhy: ['insert places the new element(s) BEFORE the iterator position, so the first inserted value sits at index ' + pos + '.', useCount ? 'insert(pos, n, value) inserts n copies, not one.' : 'insert(pos, value) inserts exactly one element.', 'The vector contains the inserted values and its size grows accordingly.'],
          explain: `insert(v.begin() + ${pos}, ...) inserts before index ${pos} and shifts the later elements right; ${useCount ? `insert(pos, n, value) adds ${cnt} copies` : 'insert(pos, value) adds one element'}, so the size grows to ${res.length}.`,
        };
      },
    },
];
