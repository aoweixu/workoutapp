import type { Implement } from "../lib/load";
import {
  IconBarbellLoad,
  IconBodyweight,
  IconCable,
  IconDumbbell,
  IconFixedBar,
  IconMachine,
  IconPlate,
} from "./Icons";

const ICONS = {
  bodyweight: IconBodyweight,
  dumbbell: IconDumbbell,
  barbell: IconBarbellLoad,
  fixedbar: IconFixedBar,
  cable: IconCable,
  machine: IconMachine,
  plate: IconPlate,
} as const;

export function ImplementIcon(props: { implement: Implement; size?: number; className?: string }) {
  const Icon = ICONS[props.implement] ?? IconBodyweight;
  return <Icon size={props.size} className={props.className} />;
}
