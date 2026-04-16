export default function About() {
  return (
    <main className="flex justify-between items-center">
      <div className="flex flex-col gap-24">
        <div className="flex flex-col gap-4 w-sm">
          <span className="text-xl">About Us</span>
          <h1 className="text-3xl">
            Providing Advanced Care with Modern Equipment
          </h1>
          <p className="text-lg">
            Fast access to general consultations, follow-ups, and health records
            in one responsive flow.
          </p>

          <a
            className="bg-blue-500 w-fit text-xl px-6 py-3 text-white rounded-full"
            href="/"
          >
            Read More
          </a>
        </div>

        <div className="max-w-lg grid grid-cols-2 gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl">15</h1>
            <div className="w-48 h-0.5 rounded-full bg-neutral-400"></div>
            <span className="text-lg">Years of Experience</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl">50+</h1>
            <div className="w-48 h-0.5 rounded-full bg-neutral-400"></div>
            <span className="text-xl">Certified Specialists</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl">20+</h1>
            <div className="w-48 h-0.5 rounded-full bg-neutral-400"></div>
            <span className="text-xl">Medical Achieved</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl">15k+</h1>
            <div className="w-48 h-0.5 rounded-full bg-neutral-400"></div>
            <span className="text-xl">Satisfied Customers</span>
          </div>
        </div>
      </div>

      <div className="h-128 w-lg">
        <img src="/about.png" />
      </div>
    </main>
  );
}
