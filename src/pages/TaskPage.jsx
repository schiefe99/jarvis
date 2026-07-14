import {ChevronLeftIcon} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";


function TaskPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const title = searchParams.get("title");
    const description = searchParams.get("description");
    return(
         <div className="h-screen w-screen bg-slate-500 p-6">

          <div className="w-[500px] space-y-4">
            <div className="felx justify-center relative mb-6 ">
                <button 
                 onClick={() => navigate(-1)}
                 className="absolute left-0 top-0 bottom-0 text-slate-100" >
                    <ChevronLeftIcon />
                </button>
            </div>
            <h1 className="text- 3xl text-slate-100 font-bold text-center">
                Detalhes da Tarefa
            </h1>
            <div className="bg bg-slate-400 p-4 rounded-md text-center">
                <h2 className="text-xl text-white font-bold">{title}</h2>
                <p className="text-slate-600">{description}</p>

            </div>
                
            </div>
        </div>
    );
}

export default TaskPage;