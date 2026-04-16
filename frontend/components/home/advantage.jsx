export default function Advantage() {
  return (
    <main className="flex items-start justify-between gap-12">
      <div className="flex flex-col gap-4 w-sm">
        <span className="text-xl">Our Advantage</span>
        <h1 className="text-3xl">
          Maximizing Care Efficiency at Medical Clinics
        </h1>
        <p className="text-lg">
          We bring together expert care, modern tools, and patient-focused
          service to make every visit smooth, efficient, and effective.
        </p>

        <a
          className="bg-blue-500 w-fit text-lg px-6 py-3 text-white rounded-full"
          href="/"
        >
          Appointment
        </a>
      </div>

      <div className="flex gap-4">
        <img src="/advantage/bg1.png" className="rounded-2xl h-112 w-auto" />
        <img src="/advantage/bg2.png" className="rounded-2xl h-112 w-auto"/>
      </div>
    </main>
  );
}
