const fs = require('fs/promises');
const path = require('path')
const _ = require('lodash');
const {create} = require('ipfs-http-client')


//////////////////////////////////////////////
// -------- URI helpers
//////////////////////////////////////////////

/**
 * @param {string} cidOrURI either a CID string, or a URI string of the form `ipfs://${cid}`
 * @returns the input string with the `ipfs://` prefix stripped off
 */
 function stripIpfsUriPrefix(cidOrURI) {
    if (cidOrURI.startsWith('ipfs://')) {
        return cidOrURI.slice('ipfs://'.length)
    }
    return cidOrURI
}

function ensureIpfsUriPrefix(cidOrURI) {
    let uri = cidOrURI.toString()
    if (!uri.startsWith('ipfs://')) {
        uri = 'ipfs://' + cidOrURI
    }
    // Avoid the Nyan Cat bug (https://github.com/ipfs/go-ipfs/pull/7930)
    if (uri.startsWith('ipfs://ipfs/')) {
      uri = uri.replace('ipfs://ipfs/', 'ipfs://')
    }
    return uri
}

/**
 *
 * @param {string} cidOrURI - an ipfs:// URI or CID string
 * @returns {CID} a CID for the root of the IPFS path
 */
function extractCID(cidOrURI) {
    // remove the ipfs:// prefix, split on '/' and return first path component (root CID)
    const cidString = stripIpfsUriPrefix(cidOrURI).split('/')[0]
    return new CID(cidString)
}

//////////////////////////////////////////////
// -------- Main starts here
//////////////////////////////////////////////


// IPFS instance
const ipfs = create();

// Configure pinning service
const config = {
  pinningService: {
    name: 'pinata',
    endpoint: 'https://api.pinata.cloud/',
    key: process.env.PINATA_KEY,
  }
}

/**
 * Configure IPFS to use the remote pinning service from our config.
 *
 * @private
 */
async function _configurePinningService() {
    if (!config.pinningService) {
        throw new Error(`No pinningService set up in minty config. Unable to pin.`)
    }

    // check if the service has already been added to js-ipfs
    for (const svc of await ipfs.pin.remote.service.ls()) {
        if (svc.service === config.pinningService.name) {
            // service is already configured, no need to do anything
            return
        }
    }

    // add the service to IPFS
    const { name, endpoint, key } = config.pinningService
    if (!name) {
        throw new Error('No name configured for pinning service')
    }
    if (!endpoint) {
        throw new Error(`No endpoint configured for pinning service ${name}`)
    }
    if (!key) {
        throw new Error(`No key configured for pinning service ${name}.` +
          `If the config references an environment variable, e.g. '$$PINATA_API_TOKEN', ` +
          `make sure that the variable is defined.`)
    }
    await ipfs.pin.remote.service.add(name, { endpoint, key })
}

async function pin(cid) {
  // Make sure IPFS is set up to use our preferred pinning service.
  await _configurePinningService()

  // Actually pin
  await ipfs.pin.remote.add(cid, { service: config.pinningService.name})
}

/*
 * Uploads a file and a metadata object
 **/
async function uploadFileAndMetadataToIpfs(filePath, name, userMetadata, shouldPin) {
  const fileName = path.basename(name)
  const content = await fs.readFile(filePath)

  // When you add an object to IPFS with a directory prefix in its path,
  // IPFS will create a directory structure for you. This is nice, because
  // it gives us URIs with descriptive filenames in them e.g.
  // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM/cat-pic.png' instead of
  // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM'
  const { cid: assetCid } = await ipfs.add({ path: '/nft/' + fileName, content })

  // make the NFT metadata JSON
  const metadata = _.extend(userMetadata, {
    name: fileName,
    image: ensureIpfsUriPrefix(assetCid) + '/' + fileName
  });

  // add the metadata to IPFS
  const { cid: metadataCid } = await ipfs.add({ path: '/nft/metadata.json', content: JSON.stringify(metadata)})
  const metadataURI = ensureIpfsUriPrefix(metadataCid) + '/metadata.json'

  if (shouldPin) {
    const assetURI = ensureIpfsUriPrefix(assetCid) + '/' + fileName

    console.log(`Pinning asset data (${assetURI})...`)
    await pin(assetCid)

    console.log(`Pinning metadata (${metadataURI})...`)
    await pin(metadataCid)
  }

  return metadataURI;
}


//////////////////////////////////////////////
// -------- Calling main
//////////////////////////////////////////////

async function main() {
  const metadataURI = await uploadFileAndMetadataToIpfs('./goku.jpeg', 'Goku.jpeg',
     {description: 'A young Goku surfing on a Cloud'}, true);

  console.log(metadataURI);
}

main();
