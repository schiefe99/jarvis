import { useState } from "react";

function AddTask({ onAddTaskSubmit }){
    // para capturar o valor de um INPUT uma das formas é utilizar STATES
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState(""); 
   

return (
<div className=" space-y-4 p-6 bg-slate-200 rounded-md shadow flex flex-col " >
    <input type="text"
     placeholder="Digite o titulo da tarefa" 
     className="border border-slate-300 rounded-md text-center shadow outline-slate-400 px-4 py-2"
     value={title}
     ///sempre que quiser usar uma função dentro de uma tag, usar -> onChange={}
     onChange={(event) => setTitle(event.target.value)}
      />
    <input type="text" 
    placeholder="Digite a descrição da tarefa" 
    className="border border-slate-300 rounded-md text-center shadow outline-slate-400 px-4 py-2"
    value={description}
     onChange={(event) => setDescription(event.target.value)}
     />
    <button
    onClick={() => {
        //verficar se o titulo ou a descrição da tarefa foram inputadas
        if (!title.trim() || !description.trim()){ // o trim serve para evitar que se digitar espaço seja salva a tarefa 
            return alert("Preencha os campos")
        }
        onAddTaskSubmit(title, description);
        setTitle("");
        setDescription("");

    }} 

    className=" bg-green-500 rounded-md p-2 text-white">
        Adicionar
    </button>
</div>
);

}
export default AddTask;