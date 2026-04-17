const services = [
    {
        title : "Cardiology",
        icon :  <></>,
        description : "Expert heart health care with advanced diagonistics and personalized treatment plans.",
    },
    {
        title : "Neurology",
        icon :  <></>,
        description : "Specialized care for brain, spine and nervous system disorders with a focus",
    },
    {
        title : "General Surgery",
        icon :  <></>,
        description : "Safe modern surgical solutions for a variety of conditions with a focus on precision and recovery.",
    },
    {
        title : "Orthopedics",
        icon :  <></>,
        description : "Comprehensive care for bones, joints and muscles to restore mobility and strength.",
    },
    {
        title : "Pediatrics",
        icon :  <></>,
        description : "Compassionate healthcare tailored for infants, children and teens to support healthy development.",
    },
    {
        title : "Gynecology",
        icon :  <></>,
        description : "Comprehensive women health services for all stages of life from wellness to specialized care.",
    },
    {
        title : "Dermatology",
        icon :  <></>,
        description : "Expert skin care solutions for healthy, radiant skin tailored for your needs.",
    },
    {
        title : "Dentistry",
        icon :  <></>,
        description : "Full spectrum dental care from routine checkups to advanced cosmetic procedures.",
    },
]

export default function Grid() {
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
          <a
            href="/services"
            className="bg-blue-500 py-3 px-4 rounded-full text-white"
          >
            Contact Us
          </a>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-8 py-12">
        {services.map((item, index) => (
            <div key={index} className="col-span-1 h-64 bg-neutral-200/50 shadow-md rounded-2xl p-6 flex flex-col justify-between"> 
                <h1 className="text-xl">
                    {item.title}
                </h1>
                <span className="">
                    {item.description}
                </span>
            </div>
        ))}
      </div>
    </main>
  );
}
