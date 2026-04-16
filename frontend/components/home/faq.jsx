"use client"
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const points = [
    {
        question : "What services do your hospital provide?",
        solution : "We offer a wide range of specialties including cardiology, neurology, surgery, orthopedics, pediatrics, gynecology, dermatology, and dentistry.",
    },
    {
        question : "Do I need an appointment to visit the hospital?",
        solution : "While walk-ins are welcome for some services, we recommend booking an appointment to ensure minimal waiting time.",
    },
    {
        question : "Do you accept insurance?",
        solution : "Yes, we work with most major insurance providers. Please contact us to confirm coverage before your visit.",
    },
    {
        question : "How do i prepare for my first appointment?",
        solution : "Bring a valid ID, insurance details, and any previous medical records or prescriptions related to your condition.",
    },
    {
        question : "Are your doctors board certified?",
        solution : "Yes, all of our specialists are highly qualified, experienced, and board-certified in their respective fields.",
    }
]

export default function Faq() {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggle = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <main className="flex items-center justify-between">
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-4 w-sm">
          <span className="text-lg">Our FAQ</span>
          <h1 className="text-3xl">
            Everything you need to know about our medical care in one place
          </h1>
        </div>

        <div className="max-w-lg flex flex-col gap-4 w-2xl">
          {points.map((item, index) => (
            <div
              key={index}
              className="rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggle(index)}
                className="w-full text-left py-2 flex text-lg justify-between items-center border-b border-neutral-300"
              >
                {item.question}
                <span className="text-blue-500 text-2xl">{activeIndex === index ? "-" : "+"}</span>
              </button>

              <AnimatePresence>
                {activeIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 text-md"
                  >
                    {item.solution}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <div className="w-lg h-128">
        <img src="/faq.webp" className="rounded-2xl" />
      </div>
    </main>
  );
}
