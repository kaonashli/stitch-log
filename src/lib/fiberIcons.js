// Which little icon goes with each fiber (Favorite fibers widget).
// Fibers are matched by name (see FIBER_GROUPS in constants.js); anything
// not listed here gets the icon for its group, or a ball of yarn.
import {
  CircleHelp, Ellipsis, FlaskConical, Flower2, Leaf, Milk, MoveHorizontal, Rabbit, Rat, Recycle, Sparkles,
  Trees, Waves, Wheat, Bean,
} from 'lucide-react'
import { Alpaca, Bamboo, Cocoon, CottonBoll, Goat, Sheep, Yak, YarnBall } from './customIcons.jsx'
import { FIBER_GROUPS } from './constants.js'

const BY_NAME = {
  // camelids (and the camel)
  Alpaca, 'Baby Alpaca': Alpaca, 'Suri Alpaca': Alpaca, Llama: Alpaca, Vicuna: Alpaca, Guanaco: Alpaca, Camel: Alpaca,
  // goats
  Cashmere: Goat, Mohair: Goat, 'Kid Mohair': Goat,
  // big shaggy animals
  Yak, Bison: Yak, Qiviut: Yak,
  // small furry ones
  Angora: Rabbit, Possum: Rat,
  // silk
  Silk: Cocoon, 'Tussah Silk': Cocoon, 'Wild Silk': Cocoon,
  // plants
  Cotton: CottonBoll, 'Pima Cotton': CottonBoll, 'Organic Cotton': CottonBoll, 'Mercerized Cotton': CottonBoll,
  Linen: Flower2, // flax has little blue flowers
  Bamboo, 'Bamboo Viscose': Bamboo,
  // made from plants
  'Rayon / Viscose': Trees, Modal: Trees, 'Lyocell / Tencel': Trees, Cupro: Trees,
  'Soy Silk': Bean, 'Milk Fiber': Milk, Seacell: Waves, 'Corn (PLA)': Wheat,
  // synthetic
  'Spandex / Elastane': MoveHorizontal, // it stretches
  'Metallic / Lurex': Sparkles,
  'Recycled Polyester': Recycle, 'Recycled Nylon': Recycle, 'Recycled Cotton': Recycle, 'Recycled Wool': Recycle,
  Unknown: CircleHelp,
  Other: Ellipsis,
}

// The rest of each group
const BY_GROUP = {
  'Wool and sheep breeds': Sheep,
  'Other animal fibers': Sheep,
  'Plant fibers': Leaf,
  'Made from plants (regenerated)': Trees,
  Synthetic: FlaskConical,
  Other: Ellipsis,
}

export function fiberIcon(fiber) {
  if (BY_NAME[fiber]) return BY_NAME[fiber]
  const group = FIBER_GROUPS.find((g) => g.fibers.includes(fiber))
  return (group && BY_GROUP[group.label]) || YarnBall
}
