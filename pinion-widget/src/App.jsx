import { PinionWidget } from "./pinion-widget";

function App() {
  return (
    <div data-pinion-root="">
      <div className="App container mx-auto">
        <PinionWidget source="/test"/>
      </div>
    </div>
  );
}

export default App;
