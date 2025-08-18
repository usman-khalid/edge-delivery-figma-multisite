import { register, transformFontWeight } from '@tokens-studio/sd-transforms';
import { promises } from 'fs';
import StyleDictionary from 'style-dictionary';

/**
 * Register StyleDictionary
 */
register(StyleDictionary);

/**
 *
 * @param {String} input the input to work with.
 * @returns a kebab-case representation of the string.
 */
const toKebabCase = (input) =>
  input &&
  input
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((val) => val.toLowerCase())
    .join('-');

/**
 * Custom transform to remove redundant keywords.
 */
StyleDictionary.registerTransform({
  name: 'name/no-repeat',
  type: 'name',
  transform: (prop) => {
    return prop.name
      .split('-')
      .filter((part, index, arr) => arr.indexOf(part) === index)
      .join('-');
  },
});

/**
 * Builds the design system.
 */
async function buildDesignSystem() {
  const $themes = JSON.parse(await promises.readFile('./tokens/$themes.json'));
  const configs = $themes.map(({ selectedTokenSets, name }) => ({
    log: {
      warnings: 'disabled',
    },
    source: Object.entries(selectedTokenSets)
      .filter(([, val]) => val !== 'disabled')
      .map(([tokenset]) => `./tokens/${tokenset}.json`),
    preprocessors: ['tokens-studio'],
    platforms: {
      css: {
        prefix: 'ds',
        transformGroup: 'tokens-studio',
        transforms: [
          'name/kebab',
          'name/no-repeat',
          'color/css',
          'size/rem',
          'time/seconds',
          'fontFamily/css',
          'content/quote',
        ],
        files: [
          {
            destination: `./styles/themes/${toKebabCase(name)}/${toKebabCase(name)}.css`,
            format: 'css/variables',
            options: {
              outputReferences: true,
            },
          },
        ],
      },
    },
  }));

  async function cleanAndBuild(cfg) {
    const sd = new StyleDictionary(cfg);
    await sd.cleanAllPlatforms();
    await sd.buildAllPlatforms();
  }
  await Promise.all(configs.map(cleanAndBuild));
}

buildDesignSystem();
