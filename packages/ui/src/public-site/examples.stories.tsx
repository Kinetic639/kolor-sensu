import type { Meta, StoryObj } from "@storybook/react";
import {
  ArrowRight,
  Heart,
  HeartHandshake,
  House,
  Leaf,
  User,
  Users,
} from "lucide-react";
import { ArrowLink, PrimaryButton, SecondaryButton } from "./actions";
import { AnimatedWatercolorImage } from "./animated-watercolor-image";
import {
  PastelIconTile,
  SoftCard,
  WatercolorSectionBackground,
} from "./surfaces";
import { EditorialHeading, SectionEyebrow } from "./typography";
import { WatercolorImage } from "./watercolor-image";

// Isolated composition used to check the foundation against reference A.
// It is not a page: no routing, data or copy decisions live here.

const heroPoints = [
  { icon: Leaf, label: "Doświadczeni specjaliści" },
  { icon: Users, label: "Indywidualne podejście" },
  { icon: House, label: "Przytulne gabinety" },
  { icon: Heart, label: "Atmosfera zaufania", pink: true },
];

const specialists = [
  {
    name: "Anna Nowak",
    role: "Psychoterapeutka",
    src: "/kolor-sensu/anna.jpg",
  },
  { name: "Tomasz Wójcik", role: "Psycholog", src: "/kolor-sensu/tomasz.jpg" },
  {
    name: "Katarzyna Zielińska",
    role: "Psychoterapeutka",
    src: "/kolor-sensu/kasia.jpg",
  },
];

function HomepageFragment() {
  return (
    <div className="bg-bg font-body text-ink overflow-x-clip">
      {/* Hero */}
      <section className="max-w-page px-gutter pb-section-sm mx-auto grid items-center gap-12 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:pt-20">
        <div className="grid gap-6">
          <SectionEyebrow>Centrum psychoterapii i rozwoju</SectionEyebrow>
          <EditorialHeading as="h1" accent="Więcej sensu.">
            Więcej zrozumienia.
          </EditorialHeading>
          <p className="max-w-copy text-lead text-text-muted">
            Psychoterapia, rozwój i wsparcie w bezpiecznej przestrzeni. Dla osób
            dorosłych, par, dzieci i młodzieży.
          </p>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton arrow>Umów wizytę</PrimaryButton>
            <SecondaryButton>Poznaj nas</SecondaryButton>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {heroPoints.map(({ icon: Icon, label, pink }) => (
              <li key={label} className="text-small grid gap-2">
                <Icon
                  aria-hidden="true"
                  className={pink ? "text-pink size-7" : "text-primary size-7"}
                  strokeWidth={1.25}
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <WatercolorImage
          src="/kolor-sensu/room-wide.jpg"
          alt="Jasny gabinet z fotelem, stolikiem i roślinami przy dużym oknie"
          shape="wide-brush"
          tone="sage-blush"
          caption="Przestrzeń dla ważnych rozmów"
          priority
          paint="on-load"
          sizes="(min-width: 1024px) 55vw, 100vw"
          aspectRatio="10 / 7"
          className="lg:-mr-12 xl:-mr-20"
        />
      </section>

      {/* Offer */}
      <section className="max-w-page px-gutter py-section-sm mx-auto grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-center">
        <div className="grid gap-4">
          <SectionEyebrow>Nasza oferta</SectionEyebrow>
          <EditorialHeading>
            Wsparcie w różnych obszarach życia
          </EditorialHeading>
          <p className="max-w-copy text-body text-text-muted">
            Oferujemy terapię, konsultacje i warsztaty dopasowane do Twoich
            potrzeb.
          </p>
          <ArrowLink href="#oferta">Zobacz całą ofertę</ArrowLink>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <PastelIconTile
            icon={<User />}
            title="Psychoterapia indywidualna"
            description="Przestrzeń na Ciebie i Twoje potrzeby."
            href="#indywidualna"
          />
          <PastelIconTile
            tone="blush"
            icon={<Users />}
            title="Psychoterapia par"
            description="Lepsza komunikacja, większa bliskość."
            href="#pary"
          />
          <PastelIconTile
            icon={<HeartHandshake />}
            title="Wsparcie dla dzieci i młodzieży"
            description="Zrozumienie, rozwój, bezpieczeństwo."
            href="#dzieci"
          />
          <PastelIconTile
            tone="blush"
            icon={<Leaf />}
            title="Konsultacje psychologiczne"
            description="Pierwszy krok do zmiany."
            href="#konsultacje"
          />
        </div>
      </section>

      {/* Specialists */}
      <section className="max-w-page px-gutter py-section-sm mx-auto grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-center">
        <div className="grid gap-4">
          <SectionEyebrow>Nasi specjaliści</SectionEyebrow>
          <EditorialHeading>Poznaj nasz zespół</EditorialHeading>
          <ArrowLink href="#zespol">Zobacz wszystkich specjalistów</ArrowLink>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {specialists.map((person) => (
            <li key={person.name}>
              <SoftCard interactive className="grid gap-3 p-3">
                <WatercolorImage
                  src={person.src}
                  alt={`${person.name}, ${person.role.toLowerCase()}`}
                  shape="portrait-soft"
                  aspectRatio="1 / 1"
                  focalPoint="50% 30%"
                  washes={false}
                />
                <div className="flex items-end justify-between gap-2 px-1 pb-1">
                  <div>
                    <p className="text-small font-semibold">
                      <a
                        href="#specjalista"
                        className="after:rounded-card focus-visible:after:outline-ring after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2"
                      >
                        {person.name}
                      </a>
                    </p>
                    <p className="text-small text-text-muted">{person.role}</p>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-pink mb-1 size-4"
                  />
                </div>
              </SoftCard>
            </li>
          ))}
        </ul>
      </section>

      {/* Rooms */}
      <section className="max-w-page px-gutter py-section-sm mx-auto grid items-center gap-10 lg:grid-cols-2">
        <AnimatedWatercolorImage
          src="/kolor-sensu/room.jpg"
          alt="Gabinet z beżowym fotelem, stolikiem i roślinami"
          shape="soft-horizontal"
          tone="blush"
        />
        <div className="grid gap-4">
          <SectionEyebrow>Nasze gabinety</SectionEyebrow>
          <EditorialHeading>Przestrzeń, która wspiera</EditorialHeading>
          <p className="max-w-copy text-body text-text-muted">
            Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i
            poczuciu bezpieczeństwa.
          </p>
          <ArrowLink href="#gabinety">Zobacz nasze gabinety</ArrowLink>
        </div>
      </section>

      {/* Workshops */}
      <section className="max-w-page px-gutter py-section-sm mx-auto grid items-center gap-10 lg:grid-cols-2">
        <div className="grid gap-4 lg:order-first">
          <SectionEyebrow>Warsztaty i rozwój</SectionEyebrow>
          <EditorialHeading>Wydarzenia, które inspirują</EditorialHeading>
          <p className="max-w-copy text-body text-text-muted">
            Warsztaty, grupy rozwojowe i spotkania tematyczne dla osób, które
            chcą lepiej siebie rozumieć.
          </p>
          <ArrowLink href="#warsztaty">Zobacz nadchodzące wydarzenia</ArrowLink>
        </div>
        <AnimatedWatercolorImage
          src="/kolor-sensu/group.jpg"
          alt="Uczestnicy warsztatu rozmawiają w kręgu"
          shape="wide-brush"
          tone="sage-blush"
          aspectRatio="2 / 1"
        />
      </section>

      {/* Call to action */}
      <WatercolorSectionBackground accent className="my-section-sm py-16">
        <div className="max-w-page px-gutter mx-auto flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:pr-56">
          <EditorialHeading size="h3" className="lg:text-h2 max-w-xl">
            Zrób pierwszy krok do lepszego samopoczucia
          </EditorialHeading>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton arrow>Umów wizytę</PrimaryButton>
            <SecondaryButton>Skontaktuj się</SecondaryButton>
          </div>
        </div>
      </WatercolorSectionBackground>
    </div>
  );
}

const meta = {
  title: "Public site/Examples",
  component: HomepageFragment,
  parameters: { canvasPadding: false },
} satisfies Meta<typeof HomepageFragment>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HomepageFragmentDesktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

export const HomepageFragmentMobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
