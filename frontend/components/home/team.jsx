const Doctor = [
    {
        name : "Dr. Matthew Harris",
        title : "Dentist",
        about : "Dentist providing comprehensive dental care, from checkups to cosmetic solutions.",
        path : "/team/doc1.webp",
    },
    {
        name : "Dr. Benjamin Lee",
        title : "Dermatologist",
        about : "Dermatologist specializing in skin health and advanced cosmetic treatments.",
        path : "/team/doc2.webp",
    },
    {
        name : "Dr. Sarah Mitchell",
        title : "Cardiologist",
        about : "Expert cardiologist focused on prventive heart care and advanced treatments.",
        path : "/team/doc3.webp",
    },
    {
        name : "Dr. Daniel Hayes",
        title : "Neurologist",
        about : "Neurologist specializing in brain and nervous system disorders with patient centered approach.",
        path : "/team/doc4.webp",
    }
]

export default function Team() {
  return (
    <main>
      <div className="flex justify-between items-end py-4">
        <div className="flex flex-col gap-2">
          <span className="text-lg">Our Team</span>
          <h1 className="text-3xl w-sm">
            Meet Our Expert Team in Providing Advanced Care
          </h1>
        </div>

        <div>
          <a href="/" className="bg-blue-500 py-3 px-4 rounded-full text-white">
            All Members
          </a>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 py-12">
        {Doctor.map((item, index) => (
          <div className="col-span-1 relative rounded-xl border border-neutral-200 overflow-hidden shadow-lg group" key={index}>
            <img
              src={item.path}
              className="h-112 w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            <div className="absolute top-0 left-0 w-full bg-white/40 text-black p-3">
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <p className="text-sm">{item.title}</p>
            </div>

            <div className="absolute bottom-0 left-0 w-full bg-white/90 text-black p-3 text-sm">
              {item.about}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
