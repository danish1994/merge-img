import isPlainObj from 'is-plain-obj';
import Jimp, {read} from 'jimp';
import alignImage from './utils/alignImage';
import calcMargin from './utils/calcMargin';

export default function mergeImg(images, {
  direction = 'col',
  color = 0x00000000,
  align = 'start',
  offset = 0,
  margin,
} = {}) {
  if (!Array.isArray(images)) {
    throw new TypeError('`images` must be an array that contains images');
  }

  if (images.length < 1) {
    throw new Error('At least `images` must contain more than one image');
  }

  const processImg = (img) => {
    if (isPlainObj(img)) {
      const {src, offsetX, offsetY} = img;

      return read(src)
        .then((imgObj) => ({
          img: imgObj,
          offsetX,
          offsetY,
        }));
    }

    return read(img).then((imgObj) => ({img: imgObj}));
  };

  direction = direction === 'row';

  return Promise.all(images.map(processImg))
    .then((imgs) => {
      let totalX = 0;
      let totalY = 0;

      const imgData = imgs.reduce((res, {img, offsetX = 0, offsetY = 0}) => {
        const {bitmap: {width, height}} = img;

        res.push({
          img,
          x: offsetX,
          y: offsetY,
          offsetX,
          offsetY,
          width,
          height
        });

        totalX += width + offsetX;
        totalY += height + offsetY;

        return res;
      }, []);

      console.log(imgData)

      const {top, right, bottom, left} = calcMargin(margin);
      const marginTopBottom = top + bottom;
      const marginRightLeft = right + left;

      // const totalWidth = direction
      //   ? Math.max(...imgData.map(({img: {bitmap: {width}}, offsetX}) => width + offsetX))
      //   : imgData.reduce((res, {img: {bitmap: {width}}, offsetX}, index) => res + width + offsetX + (Number(index > 0) * offset), 0);
      //
      // const totalHeight = direction
      //   ? imgData.reduce((res, {img: {bitmap: {height}}, offsetY}, index) => res + height + offsetY + (Number(index > 0) * offset), 0)
      //   : Math.max(...imgData.map(({img: {bitmap: {height}}, offsetY}) => height + offsetY));

      const totalWidth = direction
        ? Math.max(...imgData.map((el) => el.width))
        : Math.max(...imgData.map((el) => el.height));

      const totalHeight = direction
        ? Math.max(...imgData.map((el) => el.height))
        : Math.max(...imgData.map((el) => el.width));

      console.log(totalHeight, totalWidth);

      const baseImage = new Jimp(totalWidth + marginRightLeft, totalHeight + marginTopBottom, color);

      // Fallback for `Array#entries()`
      const imgDataEntries = imgData.map((data, index) => [index, data]);

      for (const [index, {img, x, y, offsetX, offsetY}] of imgDataEntries) {
        const {bitmap: {width, height}} = img;
        const [px, py] = direction
          ? [alignImage(totalWidth, width, align) + offsetX, y + (index * offset)]
          : [x + (index * offset), alignImage(totalHeight, height, align) + offsetY];

        baseImage.composite(img, px + left, py + top);
      }

      return baseImage;
    });
}
