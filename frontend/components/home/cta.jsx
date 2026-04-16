"use client"
import { motion, useInView } from "framer-motion";
import { useEffect, useState, useRef } from "react";

export default function Cta(){
    const [count, setCount] = useState(0);
    const target = 10000000;
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
      if (!isInView) return;

      let start = 0;
      let duration = 2000;
      let startTime = null;

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;

        const current = Math.min((progress / duration) * target, target);
        setCount(Math.floor(current));

        if (progress < duration) {
          requestAnimationFrame(animate);
        } else {
          setCount(target);
        }
      };

      requestAnimationFrame(animate);
    }, [isInView]);

    return(
        <main ref={ref} className="relative flex flex-col justify-center items-center gap-6 h-[60vh] overflow-hidden">
            {/* Floating Circles */}
            <motion.div
              className="absolute top-10 left-20 w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-xs text-center p-2"
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
                24/7 Care
            </motion.div>

            <motion.div
              className="absolute top-20 right-24 w-28 h-28 rounded-full bg-green-100 flex items-center justify-center text-xs text-center p-2"
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
                Expert Doctors
            </motion.div>

            <motion.div
              className="absolute bottom-16 left-32 w-36 h-36 rounded-full bg-purple-100 flex items-center justify-center text-xs text-center p-2"
              animate={{ y: [0, -25, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
                Modern Equipment
            </motion.div>

            <motion.div
              className="absolute bottom-20 right-20 w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center text-xs text-center p-2"
              animate={{ y: [0, -18, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
                Fast Service
            </motion.div>

            {/* Main Content */}
            <h1 className="text-2xl w-xl text-center z-10">
                Join our health community and take the first step towards a healthier you.
            </h1>

            <span className="text-8xl text-blue-500 z-10">
              {count.toLocaleString()}
            </span>
        </main>
    );
}