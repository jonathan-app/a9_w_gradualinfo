"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { DribbbleIcon, GithubIcon, LinkedinIcon, TwitterIcon } from "../Icons";
import Link from "next/link";
import siteMetadata from "@/src/utils/siteMetaData";
import { socialProfiles, whatsappLink } from "@/src/utils/socials";

const ICONS = {
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
  github: GithubIcon,
  dribbble: DribbbleIcon,
};

const Footer = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const onSubmit = (data) => console.log(data);
  console.log(errors);

  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 rounded-2xl bg-dark dark:bg-accentDark/90 m-2 sm:m-10 flex flex-col items-center text-light dark:text-dark">
      <h3 className="mt-16 font-medium dark:font-bold text-center text-2xl sm:text-3xl lg:text-4xl px-4">
        Estratégia | Conteúdo | Resultados
      </h3>
      <p className="mt-5 px-4 text-center w-full sm:w-3/5 font-light dark:font-medium text-sm sm:text-base">
        Conteúdo prático da {siteMetadata.title} sobre presença digital, captação
        de clientes e automação para empresas locais.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 w-fit sm:min-w-[384px] flex items-stretch bg-light dark:bg-dark p-1 sm:p-2 rounded mx04"
      >
        <input
          type="email"
          placeholder="Digite seu e-mail"
          aria-label="Seu e-mail"
          {...register("email", { required: true, maxLength: 80 })}
          className="w-full bg-transparent pl-2 sm:pl-0 text-dark focus:border-dark focus:ring-0 border-0 border-b mr-2 pb-1"
        />

        <input
          type="submit"
          aria-label="Assinar"
          className="bg-dark text-light dark:text-dark dark:bg-light cursor-pointer font-medium rounded px-3 sm:px-5 py-1"
        />
      </form>

      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 px-5 py-2.5 rounded-full bg-cta text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Falar no WhatsApp
        </a>
      )}

      {socialProfiles.length > 0 && (
      <div className="flex items-center mt-8">
        {socialProfiles.map(({ key, label, url }) => {
          const Icon = ICONS[key];
          return Icon ? (
            <a
              key={key}
              href={url}
              className="inline-block w-6 h-6 mr-4"
              aria-label={`GradualInfo no ${label}`}
              target="_blank"
              rel="noopener noreferrer me"
            >
              <Icon className="hover:scale-125 transition-all ease duration-200" />
            </a>
          ) : null;
        })}
      </div>
      )}

      <div className="w-full  mt-16 md:mt-24 relative font-medium border-t border-solid border-light py-6 px-8 flex  flex-col md:flex-row items-center justify-between">
        <span className="text-center">
          &copy;{year} {siteMetadata.title}. Todos os direitos reservados.
        </span>
        <Link
          href="/sitemap.xml"
          className="text-center underline my-4 md:my-0"
        >
          sitemap.xml
        </Link>
        <a
          href={siteMetadata.siteUrl}
          className="text-center underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          gradualinfo.com.br
        </a>
      </div>
    </footer>
  );
};

export default Footer;
