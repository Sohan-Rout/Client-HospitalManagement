export default function AboutUs() {
  return (
    <main className="flex gap-4 justify-center">
      <div className="flex flex-col justify-between bg-neutral-200 w-sm p-4 rounded-2xl">
        <div className="flex flex-col gap-4 w-sm">
          <span className="text-xl">About Us</span>
          <h1 className="text-3xl">
            Providing Advanced Care with Modern Equipment
          </h1>
        </div>

        <div className="max-w-lg grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl">15</h1>
            <div className="w-24 h-0.5 rounded-full bg-neutral-400"></div>
            <span className="text-md">Years of Experience</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl">50+</h1>
            <div className="w-24 h-0.5 rounded-full bg-neutral-400"></div>
            <span className="text-md">Certified Specialists</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl">20+</h1>
            <div className="w-24 h-0.5 rounded-full bg-neutral-400"></div>
            <span className="text-md">Medical Achieved</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl">15k+</h1>
            <div className="w-24 h-0.5 rounded-full bg-neutral-400"></div>
            <span className="text-md">Satisfied Customers</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <img className="rounded-2xl h-68" src="/about/one.webp" />
        <img className="rounded-2xl h-68" src="/about/two.webp" />
      </div>

      <div>
        <img className="rounded-2xl h-140" src="/about/three.webp" />
      </div>
    </main>
  );
}
