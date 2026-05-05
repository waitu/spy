export const sectionPath = (sectionKey) => `/section/${sectionKey}`;
export const topicPath = (sectionKey, topicSlug) => `/section/${sectionKey}/${topicSlug}`;
export const storyPath = (storyId) => `/story/${storyId}`;

export function toDateInputValue(value) {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
}

export function toStoryImageBackground(value) {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return 'linear-gradient(135deg, #e9dccf 0%, #d9c2aa 100%)';
  }

  if (
    normalizedValue.startsWith('linear-gradient(') ||
    normalizedValue.startsWith('radial-gradient(') ||
    normalizedValue.startsWith('conic-gradient(') ||
    normalizedValue.startsWith('url(')
  ) {
    return normalizedValue;
  }

  return `url("${normalizedValue}")`;
}

function parseDirectiveFields(rawValue) {
  return String(rawValue ?? '')
    .split('|')
    .map((item) => item.trim());
}

export function parseStoryBody(body) {
  const normalizedBody = String(body ?? '').replace(/\r\n/g, '\n').trim();

  if (!normalizedBody) {
    return [];
  }

  return normalizedBody
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (chunk.startsWith('## ')) {
        return {
          type: 'heading',
          content: chunk.slice(3).trim(),
        };
      }

      if (chunk.startsWith('[image]')) {
        const [source = '', alt = '', caption = '', credit = ''] = parseDirectiveFields(chunk.slice(7));

        return {
          type: 'image',
          source,
          alt,
          caption,
          credit,
        };
      }

      if (chunk.startsWith('[product]')) {
        const fields = parseDirectiveFields(chunk.slice(9));

        if (fields.length >= 6) {
          const [image = '', merchant = '', title = '', description = '', ctaLabel = '', url = ''] = fields;
          return {
            type: 'product',
            image,
            merchant,
            title,
            description,
            ctaLabel,
            url,
          };
        }

        const [merchant = '', title = '', description = '', ctaLabel = '', url = ''] = fields;
        return {
          type: 'product',
          image: '',
          merchant,
          title,
          description,
          ctaLabel,
          url,
        };
      }

      if (chunk.startsWith('[button]')) {
        const [label = '', url = ''] = parseDirectiveFields(chunk.slice(8));

        return {
          type: 'button',
          label,
          url,
        };
      }

      if (chunk.startsWith('[quote]')) {
        return {
          type: 'quote',
          content: chunk.slice(7).trim(),
        };
      }

      return {
        type: 'paragraph',
        content: chunk
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join(' '),
      };
    })
    .filter((block) => {
      if (block.type === 'image') {
        return Boolean(block.source);
      }

      if (block.type === 'product') {
        return Boolean(block.title || block.description);
      }

      if (block.type === 'button') {
        return Boolean(block.label && block.url);
      }

      return Boolean(block.content ?? true);
    });
}
