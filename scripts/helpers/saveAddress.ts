import fs from 'fs';

export function saveAddress(jsonData: any) {
  fs.writeFile(
    "./scripts/addresses.json", JSON.stringify(jsonData), function (err) {
      if (err) {
        console.log(err);
      }
    });
}