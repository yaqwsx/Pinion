import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

export const PINION_SCOPE = ':where([data-pinion-root])';

const rootTags = new Set(['html', 'body']);
const rootPseudos = new Set([':root', ':host']);

function scopeNode() {
  return selectorParser().astSync(PINION_SCOPE).nodes[0].nodes[0].clone();
}

function isDocumentRoot(node) {
  return (node.type === 'tag' && rootTags.has(node.value.toLowerCase())) ||
    (node.type === 'pseudo' && rootPseudos.has(node.value.toLowerCase()));
}

const scopeSelectors = selectorParser(selectors => {
  selectors.each(selector => {
    let replacesDocumentRoot = false;

    // Tailwind emits theme and Preflight rules against :root, :host, html,
    // and body. Make the Pinion mount point their root instead.
    selector.nodes.forEach(node => {
      if (isDocumentRoot(node)) {
        node.replaceWith(scopeNode());
        replacesDocumentRoot = true;
      }
    });

    if (!replacesDocumentRoot) {
      selector.prepend(selectorParser.combinator({ value: ' ' }));
      selector.prepend(scopeNode());
    }
  });
});

function isInsideKeyframes(rule) {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) {
      return true;
    }
  }
  return false;
}

const scopePlugin = {
  postcssPlugin: 'scope-pinion-css',
  Rule(rule) {
    if (!isInsideKeyframes(rule)) {
      rule.selector = scopeSelectors.processSync(rule.selector);
    }
  },
};

export async function scopePinionCss(css) {
  const result = await postcss([scopePlugin]).process(css, { from: undefined });
  return result.css;
}

export function scopePinionCssPlugin() {
  return {
    name: 'scope-pinion-css',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'asset' && output.fileName.endsWith('.css')) {
          output.source = await scopePinionCss(String(output.source));
        }
      }
    },
  };
}
