// Import SDK
// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  // eslint-disable-next-line no-unused-vars
  const { context, token, actions } = await DA_SDK;
  const sectionStyles = await fetch('/tokens/da/section-styles.json');
  const sectionStylesData = await sectionStyles.json();

  // get all the keys from sectionStylesData
  const sectionStylesKeys = Object.keys(sectionStylesData);
  const h3 = document.createElement('h3');
  h3.textContent = 'Section Styles';
  document.body.append(h3);

  [...sectionStylesKeys].forEach((key) => {
    const send = document.createElement('button');
    send.textContent = key;
    send.addEventListener('click', () => { actions.sendText(key); });
    document.body.append(send);
  });
}());
