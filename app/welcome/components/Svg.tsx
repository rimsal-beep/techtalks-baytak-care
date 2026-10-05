import type { SVGProps } from "react";
import { ICONS, type IconName } from "../data/icons";
import { LOGOS } from "../data/logos";

type SvgData = { attrs: Record<string, string>; inner: string };

function Svg({ data }: { data: SvgData }) {
  return (
    <svg
      {...(data.attrs as SVGProps<SVGSVGElement>)}
      dangerouslySetInnerHTML={{ __html: data.inner }}
    />
  );
}

/** Small line icon. Add new icons in data/icons.ts. */
export function Icon({ name }: { name: IconName }) {
  return <Svg data={ICONS[name]} />;
}

/** Baytak Care house mark (variant 9 = nav/footer, 10 = small badge). */
export function Logo({ n }: { n: keyof typeof LOGOS }) {
  return <Svg data={LOGOS[n]} />;
}