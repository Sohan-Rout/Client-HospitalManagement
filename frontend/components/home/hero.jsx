export default function Hero(){
    return(
        <main
          className="flex flex-col lg:flex-row gap-8 items-center h-[80vh] justify-between"
        >
          <div className="flex flex-col items-start gap-8 max-w-2xl">
            <div className="bg-white border! border-orange-500! px-6 py-2 rounded-full">
                <span className="text-xs">Used by over 100+ Hospitals</span>
            </div>

            <div className="max-w-2xl flex flex-col gap-2">
               <h1 className="text-4xl lg:text-6xl text-center lg:text-left">Unified portal login for every care role</h1> 
               <span className="text-lg text-left">A cleaner hospital sign-in experience for patients, doctors, nurses, and admins</span>
            </div> 

            <div className="flex gap-4">
                <a href="/contact" className="shadow-lg rounded-full px-6 py-4 bg-blue-500 text-white">Book Appointment</a>
                <a href="/about" className="shadow-lg rounded-full px-6 py-4 bg-white text-black">Learn More</a>
            </div>
          </div>
          <div className="w-full flex justify-center">
              <img
                  src="/bg.png"
                  className=""
              />
          </div>
        </main>
    );
}