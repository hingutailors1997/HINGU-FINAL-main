export const parseAddress = (settings: any) => {
  let bAddress1 = settings?.shopAddress || 'Shop No. 4, Ronak Bhavan, Bachani Nagar, Daftari Road,';
  let bAddress2 = settings?.shopAddress2 || '';

  if (!bAddress2 && bAddress1.length > 50) {
    const splitIdx = bAddress1.indexOf(',', 45);
    if (splitIdx !== -1) {
      bAddress2 = bAddress1.substring(splitIdx + 1).trim();
      bAddress1 = bAddress1.substring(0, splitIdx + 1).trim();
    } else {
      bAddress2 = 'Malad (East), Mumbai - 400 097.';
    }
  } else if (!bAddress2) {
    bAddress2 = 'Malad (East), Mumbai - 400 097.';
  }

  return { bAddress1, bAddress2 };
};