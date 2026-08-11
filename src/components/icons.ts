/**
 * Registro de iconos de la web: nombre semantico -> componente de Lucide.
 *
 * Vive en un modulo aparte (y no dentro de Icon.astro) para que los archivos de
 * datos puedan tipar sus campos `icon` contra `IconName` en lugar de `string`.
 *
 * Convencion: viewBox 24x24, trazo 2 (default de Lucide), sin relleno.
 * Las importaciones son por ruta profunda para no cargar el barrel completo.
 */

import AppWindow from '@lucide/astro/icons/app-window';
import ArrowRight from '@lucide/astro/icons/arrow-right';
import Briefcase from '@lucide/astro/icons/briefcase';
import Cake from '@lucide/astro/icons/cake';
import Calendar from '@lucide/astro/icons/calendar';
import ChefHat from '@lucide/astro/icons/chef-hat';
import ChevronDown from '@lucide/astro/icons/chevron-down';
import ChevronLeft from '@lucide/astro/icons/chevron-left';
import ChevronRight from '@lucide/astro/icons/chevron-right';
import CircleCheck from '@lucide/astro/icons/circle-check';
import ClipboardCheck from '@lucide/astro/icons/clipboard-check';
import Clock from '@lucide/astro/icons/clock';
import Coffee from '@lucide/astro/icons/coffee';
import CookingPot from '@lucide/astro/icons/cooking-pot';
import Crown from '@lucide/astro/icons/crown';
import Download from '@lucide/astro/icons/download';
import Droplet from '@lucide/astro/icons/droplet';
import Euro from '@lucide/astro/icons/euro';
import FileText from '@lucide/astro/icons/file-text';
import Gem from '@lucide/astro/icons/gem';
import Gift from '@lucide/astro/icons/gift';
import Hammer from '@lucide/astro/icons/hammer';
import HandPlatter from '@lucide/astro/icons/hand-platter';
import Headset from '@lucide/astro/icons/headset';
import Heart from '@lucide/astro/icons/heart';
import Image from '@lucide/astro/icons/image';
import LayoutGrid from '@lucide/astro/icons/layout-grid';
import LayoutPanelLeft from '@lucide/astro/icons/layout-panel-left';
import Leaf from '@lucide/astro/icons/leaf';
import Lock from '@lucide/astro/icons/lock';
import Mail from '@lucide/astro/icons/mail';
import MapPin from '@lucide/astro/icons/map-pin';
import Medal from '@lucide/astro/icons/medal';
import MessageCircle from '@lucide/astro/icons/message-circle';
import MessageCircleMore from '@lucide/astro/icons/message-circle-more';
import MoveHorizontal from '@lucide/astro/icons/move-horizontal';
import Music from '@lucide/astro/icons/music';
import PartyPopper from '@lucide/astro/icons/party-popper';
import Pencil from '@lucide/astro/icons/pencil';
import Phone from '@lucide/astro/icons/phone';
import Play from '@lucide/astro/icons/play';
import RulerDimensionLine from '@lucide/astro/icons/ruler-dimension-line';
import Search from '@lucide/astro/icons/search';
import Send from '@lucide/astro/icons/send';
import Settings from '@lucide/astro/icons/settings';
import ShieldCheck from '@lucide/astro/icons/shield-check';
import Star from '@lucide/astro/icons/star';
import Store from '@lucide/astro/icons/store';
import Tag from '@lucide/astro/icons/tag';
import Target from '@lucide/astro/icons/target';
import Tent from '@lucide/astro/icons/tent';
import TrendingUp from '@lucide/astro/icons/trending-up';
import Truck from '@lucide/astro/icons/truck';
import Users from '@lucide/astro/icons/users';
import Weight from '@lucide/astro/icons/weight';
import Wrench from '@lucide/astro/icons/wrench';
import X from '@lucide/astro/icons/x';
import Zap from '@lucide/astro/icons/zap';

export const icons = {
  calendar: Calendar,
  truck: Truck,
  pin: MapPin,
  bolt: Zap,
  leaf: Leaf,
  dish: HandPlatter,
  clock: Clock,
  shield: ShieldCheck,
  headset: Headset,
  chat: MessageCircle,
  pencil: Pencil,
  clipboard: ClipboardCheck,
  confetti: PartyPopper,
  play: Play,
  rings: Heart,
  briefcase: Briefcase,
  cake: Cake,
  music: Music,
  tent: Tent,
  gift: Gift,
  euro: Euro,
  doc: FileText,
  target: Target,
  users: Users,
  image: Image,
  arrow: ArrowRight,
  grid: LayoutGrid,
  window: AppWindow,
  tag: Tag,
  wrench: Wrench,
  close: X,
  send: Send,
  phone: Phone,
  mail: Mail,
  lock: Lock,
  'check-circle': CircleCheck,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  /* Cotas del bloque de dimensiones. */
  ruler: RulerDimensionLine,
  weight: Weight,
  kitchen: CookingPot,
  drop: Droplet,
  gem: Gem,
  chef: ChefHat,
  download: Download,
  chevron: ChevronDown,
  search: Search,
  /* Iconos de /configuraciones */
  crown: Crown,
  cup: Coffee,
  check: CircleCheck,
  cog: Settings,
  medal: Medal,
  tools: Hammer,
  store: Store,
  chart: TrendingUp,
  'arrow-h': MoveHorizontal,
  plan: LayoutPanelLeft,
  /* Adorno de estrella (secciones, rating de configuraciones). */
  star: Star,
  /* Lucide no incluye iconos de marca. Este generico es el WhatsApp monocromo
     que acompana a texto (boton del modal de reserva, campo de telefono); la
     version a color de marca vive en ./icons/WhatsappIcon.astro. */
  whatsapp: MessageCircleMore,
} as const;

export type IconName = keyof typeof icons;
