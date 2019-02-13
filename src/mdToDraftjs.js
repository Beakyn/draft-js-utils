import { parseMdLine, splitMdBlocks } from './utils/draft';

function mdToDraftjs(mdString, extraStyles) {
  const paragraphs = splitMdBlocks(mdString);
  const blocks = [];
  let entityMap = {};
  let isLastAtomic = false;

  const addBlankBlock = () => {
    blocks.push({
      text: '',
      type: 'unstyled',
      depth: 0,
      inlineStyleRanges: [],
      entityRanges: []
    });
  };

  if (parseMdLine(paragraphs[0], entityMap, extraStyles).blockStyle === 'atomic') {
    addBlankBlock();
  }

  paragraphs.forEach(paragraph => {
    const result = parseMdLine(paragraph, entityMap, extraStyles);
    const isCurrentAtomic = result.blockStyle === 'atomic';

    if (isLastAtomic && isCurrentAtomic) {
      addBlankBlock();
    }

    blocks.push({
      text:
        (result.text.match(/<iframe /) || result.text.match(/<iframe>/)) &&
        result.text.match(/<\/iframe>/)
          ? ' '
          : result.text,
      type: result.blockStyle,
      depth: 0,
      inlineStyleRanges: result.inlineStyleRanges,
      entityRanges: result.entityRanges
    });
    entityMap = result.entityMap;
    isLastAtomic = isCurrentAtomic;
  });

  if (blocks[blocks.length - 1].type === 'atomic') {
    addBlankBlock();
  }

  // add a default value
  // not sure why that's needed but Draftjs convertToRaw fails without it
  if (Object.keys(entityMap).length === 0) {
    entityMap = {
      data: '',
      mutability: '',
      type: ''
    };
  }
  return {
    blocks,
    entityMap
  };
}

export { mdToDraftjs };
