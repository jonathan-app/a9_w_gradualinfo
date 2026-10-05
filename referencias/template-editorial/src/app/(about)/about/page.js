import AboutCoverSection from "@/src/components/About/AboutCoverSection";
import Skills from "@/src/components/About/Skills";
import siteMetadata from "@/src/utils/siteMetaData";
import Link from "next/link";


export const metadata = {
  title: "Sobre",
  description: `Conheça a ${siteMetadata.title}: agência digital que cria sites, landing pages, funis e automações para empresas locais crescerem com clareza.`,
  alternates: {
    canonical: "/about",
  },
};

export default function About() {
  return (
    <>
      <AboutCoverSection />
      <Skills />
      <h2 className="mt-8 font-semibold text-lg md:text-2xl self-start mx-5 xs:mx-10 sm:mx-12 md:mx-16 lg:mx-20 text-dark dark:text-light dark:font-normal"> 
      Tem um projeto em mente? Fale com a gente pelo <Link href="/contact"  className="!underline underline-offset-2"   >contato</Link> e vamos colocar no ar.
      </h2>
    </>
  );
}
