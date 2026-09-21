function EstimatedCostInput() {
  return (
    <div>
      <label
        htmlFor="estimatedCost"
        className="mb-1 block text-[12.5px] font-semibold text-[#5B5D5A]"
      >
        Estimated Cost
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8B8D89]">
          $
        </span>
        <input
          id="estimatedCost"
          name="estimatedCost"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3 py-2.5 pl-7 text-sm text-[#181A1B] outline-none transition placeholder:text-[#8B8D89] focus:border-[#1F4E79] focus:ring-2 focus:ring-[#E9F0F6]"
        />
      </div>
    </div>
  );
}
function CurrencySelect() {
  return (
    <div>
      <label
        htmlFor="currency"
        className="mb-1 block text-[12.5px] font-semibold text-[#5B5D5A]"
      >
        Currency
      </label>
      <select
        id="currency"
        name="currency"
        required
        className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3 py-2.5 text-sm text-[#181A1B] outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#E9F0F6]"
      >
        <option value="USD">USD</option>
        <option value="LBP">LBP</option>
      </select>
    </div>
  );
}


function EstimateNoteInput() {
  return (
    <div>
      <label
        htmlFor="estimateNote"
        className="mb-1 block text-[12.5px] font-semibold text-[#5B5D5A]"
      >
        Estimate Note
      </label>
      <input
        id="estimateNote"
        name="estimateNote"
        type="text"
        placeholder="e.g. Replacing the sink trap and tightening the supply line"
        className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3 py-2.5 text-sm text-[#181A1B] outline-none transition placeholder:text-[#8B8D89] focus:border-[#1F4E79] focus:ring-2 focus:ring-[#E9F0F6]"
      />
    </div>
  );
}

export { EstimateNoteInput, CurrencySelect, EstimatedCostInput };