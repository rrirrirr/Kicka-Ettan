import React from "react";
import { useSettings } from "../../contexts/SettingsContext";
import { ChevronRight, GraduationCap } from "lucide-react";
import { BrainIcon, RulerIcon, SheetIcon } from "../icons/Icons";

interface SettingsMainViewProps {
  setView: (
    view: "main" | "measurements" | "sheet" | "smart-units" | "tutorials",
  ) => void;
}

export const SettingsMainView: React.FC<SettingsMainViewProps> = ({
  setView,
}) => {
  const { baseUnitSystem, unitSystem, updateUnitSystem, updateBaseUnitSystem } =
    useSettings();

  return (
    <div className="space-y-4">
      {/* Unit System Segmented Control */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <h3 className="text-lg font-bold text-icy-black mb-3">Unit System</h3>
        <div className="flex rounded-xl bg-gray-200 p-1">
          <button
            onClick={() => updateBaseUnitSystem("metric")}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
              baseUnitSystem === "metric"
                ? "bg-white text-lavender-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Metric (cm)
          </button>
          <button
            onClick={() => updateBaseUnitSystem("imperial")}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
              baseUnitSystem === "imperial"
                ? "bg-white text-lavender-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Imperial (in)
          </button>
        </div>
      </div>

      {/* Smart Units Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl min-h-[72px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-600 flex items-center justify-center">
            <BrainIcon size={24} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-icy-black">Smart Units</h3>
          </div>
        </div>
        <div className="flex items-center gap-3 min-w-[140px] justify-end">
          <div className="w-[75px]">
            {unitSystem === "smart" && (
              <button
                onClick={() => setView("smart-units")}
                className="px-3 py-2 min-h-[44px] text-sm text-lavender-600 font-semibold hover:text-lavender-700 hover:bg-lavender-50 rounded-lg transition-colors active:scale-[0.98]"
              >
                Configure
              </button>
            )}
          </div>
          <button
            onClick={() =>
              updateUnitSystem(
                unitSystem === "smart" ? baseUnitSystem : "smart",
              )
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:ring-offset-2 ${
              unitSystem === "smart" ? "bg-lavender-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                unitSystem === "smart" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <button
        onClick={() => setView("measurements")}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group min-h-[72px]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-600 flex items-center justify-center group-hover:bg-lavender-200 transition-colors">
            <RulerIcon size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-icy-black">Measurements</h3>
          </div>
        </div>
        <ChevronRight className="text-gray-400 group-hover:text-gray-600" />
      </button>

      <button
        onClick={() => setView("sheet")}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group min-h-[72px]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <SheetIcon size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-icy-black">Sheet</h3>
          </div>
        </div>
        <ChevronRight className="text-gray-400 group-hover:text-gray-600" />
      </button>

      {/* Tutorials */}
      <button
        onClick={() => setView("tutorials")}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group min-h-[72px]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:bg-green-200 transition-colors">
            <GraduationCap size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-icy-black">Tutorials</h3>
            <p className="text-sm text-gray-500">Watch tutorials again</p>
          </div>
        </div>
        <ChevronRight className="text-gray-400 group-hover:text-gray-600" />
      </button>
    </div>
  );
};
