const basePath = process.cwd();
const fs = require('fs');

const {
  baseUri,
  description,
  namePrefix,
} = require(`${basePath}/src/config.js`);

// read json data
let rawdata = fs.readFileSync(`${basePath}/build/json/_metadata`);
let data = JSON.parse(rawdata);

data.forEach((item) => {
  item.name = `${namePrefix} #${item.edition}`;
  item.description = description;
  const fileExt = item.image.split(".").pop();

  item.image = `${baseUri}/${item.edition}.${fileExt}`;

  fs.writeFileSync(
    `${basePath}/build/json/${item.edition}`,
    JSON.stringify(item, null, 2)
  );
});

fs.writeFileSync(
  `${basePath}/build/json/_metadata`,
  JSON.stringify(data, null, 2)
);

console.log(`Updated baseUri for images to ===> ${baseUri}`);
console.log(`Updated description for images to ===> ${description}`);
console.log(`Updated name prefix for images to ===> ${namePrefix}`);
