"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
const service = [
    {
        title : "Cradiology",
        path : "/services/cardiology.webp",
    },
    {
        title : "Neurology",
        path : "/services/neurology.webp",
    },
    {
        title : "General Surgery",
        path : "/services/general.webp",
    },
    {
        title : "Orthopedics",
        path : "/services/orthopedics.webp",
    },
    {
        title : "Pediatrics",
        path : "/services/pediatrics.webp",
    },
    {
        title : "Gynecology",
        path : "/services/gynecology.webp",
    },
]

export default function Services() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);

  return (
    <main>
      <div className="flex justify-between items-end py-4">
        <div className="flex flex-col gap-2">
          <span className="text-lg">Our Services</span>
          <h1 className="text-3xl w-sm">
            Expert Healthcare Services Tailored to Your Well-being
          </h1>
        </div>

        <div>
            <a href="/services" className="bg-blue-500 py-3 px-4 rounded-full text-white">See All Services</a>
        </div>
      </div>

      <div ref={ref} className="relative py-12 overflow-hidden">
        <motion.div
          style={{ x }}
          className="flex gap-8"
        >
          {service.map((item, index) => (
            <motion.div
              key={index}
              className="relative h-80 w-70 duration-300 overflow-hidden rounded-2xl flex-shrink-0"
              whileHover={{ scale: 1.08 }}
            >
              <img
                src={item.path}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute bottom-0 left-0 w-full bg-white/50 p-4">
                <h1 className="text-lg text-center text-black">{item.title}</h1>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Left Blur */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-24 bg-linear-to-r from-neutral-50/97 to-transparent z-10" />

        {/* Right Blur */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-linear-to-l from-neutral-50/97 to-transparent z-10" />
      </div>
    </main>
  );
}
