import Link from "next/link";
import React from "react";
import { tagSlug } from "@/src/utils";
import { formatDate, formatReadingTime } from "@/src/utils/format";
import ViewCounter from "./ViewCounter";

const BlogDetails = ({ blog, slug: blogSlug }) => {
  return (
    <div className="px-2  md:px-10 bg-accent dark:bg-accentDark text-light dark:text-dark py-2 flex items-center justify-around flex-wrap text-lg sm:text-xl font-medium mx-5  md:mx-10 rounded-lg">
      <time className="m-3" dateTime={blog.publishedAt}>
        {formatDate(blog.publishedAt)}
      </time>
      <span className="m-3">
        <ViewCounter slug={blogSlug} />
      </span>
      <div className="m-3">{formatReadingTime(blog.readingTime)}</div>
      <Link href={`/categories/${tagSlug(blog.tags[0])}`} className="m-3">
        #{blog.tags[0]}
      </Link>
    </div>
  );
};

export default BlogDetails;