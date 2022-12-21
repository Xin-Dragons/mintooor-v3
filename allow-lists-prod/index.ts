import OG from './og.json';
import WL from './wl.json';

export default {
  OG,
  WL: [
    ...OG,
    ...WL
  ]
}