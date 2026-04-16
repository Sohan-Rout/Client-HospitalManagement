"use client";
import { motion } from "framer-motion";

export default function MovingStrip(){
    return (
        <div className="overflow-x-hidden py-2 w-full">
          <motion.div
            className="flex gap-10 items-center"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              duration: 10,
              ease: "linear",
            }}
          >
            {/* First set */}
            <div className="flex items-center gap-10 whitespace-nowrap">
              <span className="uppercase text-blue-500 text-6xl">
                The Science of Healing, The Art of Care
              </span>

              <div className="h-22 w-22 rotate-345">
                <img src="/strip.webp" className="aspect-square rounded-2xl" />
              </div>

              <span className="uppercase text-6xl">
                The Science of Healing, The Art of Care
              </span>
            </div>

            {/* Duplicate for seamless loop */}
            <div className="flex items-center gap-10 whitespace-nowrap">
              <span className="uppercase text-blue-500 text-6xl">
                The Science of Healing, The Art of Care
              </span>

              <div className="h-22 w-22 rotate-345">
                <img src="/strip.webp" className="aspect-square rounded-2xl" />
              </div>

              <span className="uppercase text-6xl">
                The Science of Healing, The Art of Care
              </span>
            </div>
          </motion.div>
        </div>
    );
}