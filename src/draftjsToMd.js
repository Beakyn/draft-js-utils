import {
  applyAtomicStyle,
  applyWrappingBlockStyle,
  defaultMarkdownDict,
  fixWhitespacesInsideStyle,
  getBlockStyle,
  getEntityStart,
  getEntityEnd,
  getInlineStyleRangesByLength
} from './utils/markdown';

function draftjsToMd({ blocks, entityMap }, extraMarkdownDict) {
  const markdownDict = { ...defaultMarkdownDict, ...extraMarkdownDict };
  let returnString = '';
  const appliedBlockStyles = [];

  // totalOffset is a difference of index position between raw string and enhanced ones
  let totalOffset = 0;

  blocks.forEach((block, blockIndex) => {
    if (blockIndex !== 0) {
      returnString += '\n';
      totalOffset = 0;
    }

    // add block style
    returnString += getBlockStyle(block.type, appliedBlockStyles);
    appliedBlockStyles.push(block.type);

    const appliedStyles = [];
    returnString += block.text.split('').reduce((text, currentChar, index) => {
      let newText = text;

      const sortedInlineStyleRanges = getInlineStyleRangesByLength(block.inlineStyleRanges);

      // find all styled at this character
      const stylesStartAtChar = sortedInlineStyleRanges
        .filter(({ offset }) => offset === index)
        .filter(({ style }) => markdownDict[style]); // disregard styles not defined in the md dict

      // add the symbol to the md string and push the style in the applied styles stack
      stylesStartAtChar.forEach(({ style, offset, length }) => {
        const symbolLength = markdownDict[style].length;
        newText += markdownDict[style];
        totalOffset += symbolLength;
        appliedStyles.push({
          symbol: markdownDict[style],
          range: {
            start: offset + totalOffset,
            end: offset + length + totalOffset
          },
          end: offset + (length - 1)
        });
      });

      // check for entityRanges starting and add if existing
      const entitiesStartAtChar = block.entityRanges.filter(({ offset }) => offset === index);
      entitiesStartAtChar.forEach(({ key }) => {
        newText += getEntityStart(entityMap[key]);
      });

      // add the current character to the md string
      newText += currentChar;

      // check for entityRanges ending and add if existing
      const entitiesEndAtChar = block.entityRanges.filter(
        ({ offset, length }) => offset + length - 1 === index
      );
      entitiesEndAtChar.forEach(({ key }) => {
        newText += getEntityEnd(entityMap[key]);
      });

      // apply the 'ending' tags for any styles that end in the current position in order (stack)
      while (appliedStyles.length !== 0 && appliedStyles[appliedStyles.length - 1].end === index) {
        const endingStyle = appliedStyles.pop();
        newText += endingStyle.symbol;

        newText = fixWhitespacesInsideStyle(newText, endingStyle);
        totalOffset += endingStyle.symbol.length;
      }

      return newText;
    }, '');

    returnString = applyWrappingBlockStyle(block.type, returnString);
    returnString = applyAtomicStyle(block, entityMap, returnString);
  });
  return returnString;
}

export { draftjsToMd };
