// The icons and colors a project can have. The database stores just the
// name (e.g. 'yarn', 'berry'); this file turns names into real icons/colors.
//
// To add an icon: import it from lucide-react and add it to PROJECT_ICONS.
// To add a color: add it to PROJECT_COLORS here AND add --pc-<name> for both
// themes in index.css. Names must be lowercase (the database checks this).
import {
  Backpack, Baby, Bed, Bird, CakeSlice, Cat, Cherry, Cloud, Clover, Coffee, Crown, Dog, Fish,
  Flower, Footprints, Gem, Gift, Hand, Heart, Leaf, Moon, Panda, Rabbit, Rainbow, Ribbon,
  Scissors, Shirt, ShoppingBag, Snowflake, Sofa, Sparkles, Spool, Star, Sun, Turtle,
} from 'lucide-react'
// Garments and craft tools lucide doesn't have, drawn in the same style
import { CrochetHook, Dress, KnittingNeedles, Pants, Skirt, Sweater, YarnBall } from './customIcons.jsx'

export const DEFAULT_ICON = 'yarn'
export const DEFAULT_COLOR = 'berry'

// name -> { label, Icon component }
export const PROJECT_ICONS = {
  yarn: { label: 'Ball of yarn', Icon: YarnBall },
  spool: { label: 'Spool', Icon: Spool },
  'knitting-needles': { label: 'Knitting needles', Icon: KnittingNeedles },
  'crochet-hook': { label: 'Crochet hook', Icon: CrochetHook },
  scissors: { label: 'Scissors', Icon: Scissors },
  sweater: { label: 'Sweater', Icon: Sweater },
  shirt: { label: 'T-shirt / top', Icon: Shirt },
  dress: { label: 'Dress', Icon: Dress },
  skirt: { label: 'Skirt', Icon: Skirt },
  pants: { label: 'Pants', Icon: Pants },
  footprints: { label: 'Socks', Icon: Footprints },
  hand: { label: 'Mittens / gloves', Icon: Hand },
  ribbon: { label: 'Ribbon', Icon: Ribbon },
  heart: { label: 'Heart', Icon: Heart },
  star: { label: 'Star', Icon: Star },
  sparkles: { label: 'Sparkles', Icon: Sparkles },
  flower: { label: 'Flower', Icon: Flower },
  leaf: { label: 'Leaf', Icon: Leaf },
  clover: { label: 'Clover', Icon: Clover },
  snowflake: { label: 'Snowflake', Icon: Snowflake },
  sun: { label: 'Sun', Icon: Sun },
  moon: { label: 'Moon', Icon: Moon },
  cloud: { label: 'Cloud', Icon: Cloud },
  rainbow: { label: 'Rainbow', Icon: Rainbow },
  gift: { label: 'Gift', Icon: Gift },
  baby: { label: 'Baby', Icon: Baby },
  cat: { label: 'Cat', Icon: Cat },
  dog: { label: 'Dog', Icon: Dog },
  rabbit: { label: 'Rabbit', Icon: Rabbit },
  bird: { label: 'Bird', Icon: Bird },
  turtle: { label: 'Turtle', Icon: Turtle },
  panda: { label: 'Panda', Icon: Panda },
  fish: { label: 'Fish', Icon: Fish },
  sofa: { label: 'Home decor', Icon: Sofa },
  bed: { label: 'Blanket', Icon: Bed },
  backpack: { label: 'Backpack', Icon: Backpack },
  'shopping-bag': { label: 'Bag', Icon: ShoppingBag },
  coffee: { label: 'Coffee', Icon: Coffee },
  'cake-slice': { label: 'Cake', Icon: CakeSlice },
  cherry: { label: 'Cherry', Icon: Cherry },
  gem: { label: 'Gem', Icon: Gem },
  crown: { label: 'Crown', Icon: Crown },
}

// Warm, slightly muted colors that sit well with the site's berry/cream look.
// The actual color values are CSS variables (--pc-<name>) in index.css,
// with lighter versions for dark mode.
export const PROJECT_COLORS = [
  { name: 'berry', label: 'Berry' },
  { name: 'coral', label: 'Coral' },
  { name: 'honey', label: 'Honey' },
  { name: 'olive', label: 'Olive' },
  { name: 'sage', label: 'Sage' },
  { name: 'teal', label: 'Teal' },
  { name: 'denim', label: 'Denim' },
  { name: 'lavender', label: 'Lavender' },
  { name: 'plum', label: 'Plum' },
  { name: 'cocoa', label: 'Cocoa' },
  { name: 'slate', label: 'Slate' },
]

// Safe lookups: anything unknown falls back to the default
export function iconFor(name) {
  return (PROJECT_ICONS[name] ?? PROJECT_ICONS[DEFAULT_ICON]).Icon
}

export function colorVar(name) {
  const known = PROJECT_COLORS.some((c) => c.name === name)
  return `var(--pc-${known ? name : DEFAULT_COLOR})`
}
