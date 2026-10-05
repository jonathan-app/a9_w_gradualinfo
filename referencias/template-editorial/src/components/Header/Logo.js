import Image from "next/image"
import Link from "next/link"
import profileImg from "@/public/profile-img.png"
import siteMetadata from "@/src/utils/siteMetaData"

const Logo = () => {
  return (
    <Link href="/" className="flex items-center text-dark dark:text-light" aria-label={`${siteMetadata.title} — página inicial`}>
        <div className=" w-12 md:w-14 rounded-2xl overflow-hidden mr-2 md:mr-3 shrink-0">
            <Image src={profileImg} alt={`${siteMetadata.title} — agência digital`} className="w-full h-auto" sizes="56vw" priority />
        </div>
        <span className="font-extrabold dark:font-bold text-lg md:text-xl tracking-tight">
            {siteMetadata.title}
        </span>
    </Link>
  )
}

export default Logo;