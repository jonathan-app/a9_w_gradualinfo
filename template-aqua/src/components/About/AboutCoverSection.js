import Image from 'next/image'
import React from 'react'
import profileCharacter from "../../../public/character.png"
import siteMetadata from "@/src/utils/siteMetaData"

const AboutCoverSection = () => {
  return (
    <section className='w-full md:h-[75vh] border-b-2 border-solid border-dark dark:border-light flex flex-col md:flex-row items-center justify-center text-dark dark:text-light'>
        <div className='w-full md:w-1/2 h-full border-r-2 border-solid border-dark dark:border-light flex justify-center'> 
            <Image src={profileCharacter} alt="" aria-hidden="true" 
            className='w-4/5  xs:w-3/4 md:w-full h-full object-contain object-center'
            priority
            sizes="(max-width: 768px) 100vw,(max-width: 1180px) 50vw, 50vw"
            />
        </div>

        <div className='w-full md:w-1/2 flex flex-col text-left items-start justify-center px-5 xs:p-10 pb-10 lg:px-16'>
            <h2 className='font-extrabold text-4xl xs:text-5xl sxl:text-6xl  text-center lg:text-left'>
            Presença digital que vira resultado.
            </h2>
            <p className='font-medium mt-4 text-base'>
            A {siteMetadata.title} é uma agência digital que cria sites, landing pages, funis e automações para empresas locais. Unimos estratégia, conteúdo e tecnologia para transformar visitantes em conversas todos os dias — com métricas acompanhadas desde o primeiro dia.
            </p>
        </div>
    </section>
  )
}

export default AboutCoverSection