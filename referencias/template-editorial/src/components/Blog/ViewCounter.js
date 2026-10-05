"use client";
import React, { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The counter is optional: without Supabase credentials the blog must still build
// and render, so the client is created lazily and the counter simply hides itself.
const isEnabled = Boolean(supabaseUrl && supabaseAnonKey);
const supabase = isEnabled ? createClient(supabaseUrl, supabaseAnonKey) : null;

const ViewCounter = ({ slug, noCount = false, showCount = true }) => {
  const [views, setViews] = useState(0);

  useEffect(() => {
    const incrementView = async () => {
      try {
        let { error } = await supabase.rpc("increment", {
          slug_text:slug ,
        });

        if (error){
            console.error("Error incrementing view count inside try block:", error)
        };

      } catch (error) {
        console.error(
          "An error occurred while incrementing the view count:",
          error
        );
      }
    };

    if(!noCount && supabase){
        incrementView();
    }
  }, [slug, noCount]);

  useEffect(() => {
    const getViews = async () => {
      try {
        let { data, error } = await supabase
  .from('views')
  .select('count')
  .match({slug: slug})
  .single()

        if (error){
            console.error("Error incrementing view count inside try block:", error)
        };


        setViews(data ? data.count : 0)
        
      } catch (error) {
        console.error(
          "An error occurred while incrementing the view count:",
          error
        );
      }
    };

        if(supabase){
      getViews();
    }
  }, [slug]);

  if (!isEnabled || !showCount) {
    return null;
  }

  return <div>{views} visualizações</div>;
};

export default ViewCounter;
