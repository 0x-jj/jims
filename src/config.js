const basePath = process.cwd();
const { MODE } = require(`${basePath}/constants/blend_mode.js`);
const fs = require('fs');

const namePrefix = 'Jim';
const description = 'Remember to replace this description';
const baseUri = 'ipfs://NewUriToReplace';

const layerConfigurations = [
  {
    growEditionSizeTo: 1,
    layersOrder: [
      {
        name: 'special',
        options: {
          displayName: 'Special',
        },
      },
    ],
  },
  {
    growEditionSizeTo: 1024,
    layersOrder: [
      {
        name: '0-bg',
        options: {
          displayName: 'Background',
        },
      },
      {
        name: '1-body',
        options: {
          displayName: 'Body',
        },
      },
      {
        name: '2-mouth',
        options: {
          displayName: 'Mouth',
        },
      },
      {
        name: '3-head',
        options: {
          displayName: 'Head',
        },
      },
      {
        name: '4-eyes',
        options: {
          displayName: 'Eyes',
        },
      },
      {
        name: '5-accessory',
        options: {
          displayName: 'Accessory',
        },
      },
    ],
  },
];

const shuffleLayerConfigurations = true;

const debugLogs = false;

const format = {
  width: 1440,
  height: 1440,
  smoothing: false,
};

const gif = {
  export: false,
  repeat: 0,
  quality: 100,
  delay: 250,
};

const text = {
  only: false,
  color: '#ffffff',
  size: 20,
  xGap: 40,
  yGap: 40,
  align: 'left',
  baseline: 'top',
  weight: 'regular',
  family: 'Courier',
  spacer: ' => ',
};

const background = {
  generate: true,
  brightness: '80%',
  static: false,
  default: '#000000',
};

const extraMetadata = {};

const rarityDelimiter = '#';

const uniqueDnaTorrance = 10000;

const preview = {
  thumbPerRow: 20,
  thumbWidth: 100,
  imageRatio: format.height / format.width,
  imageName: 'preview.png',
};

const preview_gif = {
  numberOfImages: 50,
  order: 'MIXED', // ASC, DESC, MIXED
  repeat: 0,
  quality: 100,
  delay: 250,
  imageName: 'preview.gif',
};

module.exports = {
  format,
  baseUri,
  description,
  background,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  preview,
  shuffleLayerConfigurations,
  debugLogs,
  extraMetadata,
  text,
  namePrefix,
  gif,
  preview_gif,
};
