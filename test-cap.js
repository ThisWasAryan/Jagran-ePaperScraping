const editionName = "agra-dehat";
const decoded = decodeURIComponent(editionName).replace(/-/g, ' ');
const displayName = decoded.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
console.log(displayName);

const k = "KASGANJ";
const decodedK = decodeURIComponent(k).replace(/-/g, ' ');
const displayK = decodedK.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
console.log(displayK);
