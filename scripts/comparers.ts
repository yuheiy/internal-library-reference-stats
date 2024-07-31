/**
 * This file contains code licensed under MIT from the Visual Studio Code project:
 *
 *   https://github.com/microsoft/vscode/blob/1.92.0/src/vs/base/common/comparers.ts
 *
 * And is covered by the following license:
 *
 *   MIT License
 *
 *   Copyright (c) 2015 - present Microsoft Corporation
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *   SOFTWARE.
 */

import { sep } from 'node:path';

// When comparing large numbers of strings it's better for performance to create an
// Intl.Collator object and use the function provided by its compare property
// than it is to use String.prototype.localeCompare()

// A collator with numeric sorting enabled, and no sensitivity to case, accents or diacritics.
const intlFileNameCollatorBaseNumeric = (() => {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return {
    collator,
    collatorIsNumeric: collator.resolvedOptions().numeric,
  };
})();

/** Compares filenames without distinguishing the name from the extension. Disambiguates by unicode comparison. */
function compareFileNames(
  one: string | null,
  other: string | null,
  _caseSensitive = false,
): number {
  const a = one || '';
  const b = other || '';
  const result = intlFileNameCollatorBaseNumeric.collator.compare(a, b);

  // Using the numeric option will make compare(`foo1`, `foo01`) === 0. Disambiguate.
  if (intlFileNameCollatorBaseNumeric.collatorIsNumeric && result === 0 && a !== b) {
    return a < b ? -1 : 1;
  }

  return result;
}

function comparePathComponents(one: string, other: string, caseSensitive = false): number {
  if (!caseSensitive) {
    one = one && one.toLowerCase();
    other = other && other.toLowerCase();
  }

  if (one === other) {
    return 0;
  }

  return one < other ? -1 : 1;
}

export function comparePaths(one: string, other: string, caseSensitive = false): number {
  const oneParts = one.split(sep);
  const otherParts = other.split(sep);

  const lastOne = oneParts.length - 1;
  const lastOther = otherParts.length - 1;
  let endOne: boolean, endOther: boolean;

  for (let i = 0; ; i++) {
    endOne = lastOne === i;
    endOther = lastOther === i;

    if (endOne && endOther) {
      return compareFileNames(oneParts[i]!, otherParts[i]!, caseSensitive);
    } else if (endOne) {
      return -1;
    } else if (endOther) {
      return 1;
    }

    const result = comparePathComponents(oneParts[i]!, otherParts[i]!, caseSensitive);

    if (result !== 0) {
      return result;
    }
  }
}
