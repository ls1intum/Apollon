interface HSL {
  h: number;
  s: number;
  l: number;
}

function hexToHSL(hex: string): HSL {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  const r: number = parseInt(result[1], 16) / 255;
  const g: number = parseInt(result[2], 16) / 255;
  const b: number = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number = 0;
  let s: number = 0;
  const l: number = (max + min) / 2;
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToHex({ h, s, l }: HSL): string {
  let r: number = 0;
  let g: number = 0;
  let b: number = 0;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p1: number, q1: number, t1: number): number => {
      if (t1 < 0) t1 += 1;
      if (t1 > 1) t1 -= 1;
      if (t1 < 1 / 6) return p1 + (q1 - p1) * 6 * t1;
      if (t1 < 1 / 2) return q1;
      if (t1 < 2 / 3) return p1 + (q1 - p1) * (2 / 3 - t1) * 6;
      return p1;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  r = Math.round(r * 255);
  g = Math.round(g * 255);
  b = Math.round(b * 255);

  const checkHex = (v: string): string => {
    return 1 === v.length ? '0' + v : v;
  };

  return '#' + checkHex(r.toString(16)) + checkHex(g.toString(16)) + checkHex(b.toString(16));
}

const mix = (color1: string, color2: string, weight: number): string => {
  color1 = color1.replace(/#/g, '');
  color2 = color2.replace(/#/g, '');

  const d2h = (d: number) => {
    return d.toString(16);
  }; // convert a decimal value to hex
  const h2d = (h: string) => {
    return parseInt(h, 16);
  }; // convert a hex value to decimal

  weight = typeof weight !== 'undefined' ? weight : 50; // set the weight to 50%, if that argument is omitted

  let color = '#';

  for (let i = 0; i <= 5; i += 2) {
    // loop through each of the 3 hex pairs—red, green, and blue
    const v1 = h2d(color1.substr(i, 2)); // extract the current pairs
    const v2 = h2d(color2.substr(i, 2));

    // combine the current pairs from each source color, according to the specified weight
    let val = d2h(Math.round(v2 + (v1 - v2) * (weight / 100.0)));

    while (val.length < 2) {
      val = '0' + val;
    } // prepend a '0' if val results in a single digit

    color += val; // concatenate val to our new color string
  }

  return color; // PROFIT!
};

export const darken = (color: string, amount: number): string => {
  const hsl = hexToHSL(color);
  const result = { ...hsl, l: hsl.l - amount / 100 };
  return hslToHex(result);
};

export const lighten = (color: string, amount: number): string => {
  const hsl = hexToHSL(color);
  const result = { ...hsl, l: hsl.l + amount / 100 };
  return hslToHex(result);
};
