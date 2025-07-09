// bitcrusher-processor.js
class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bits', defaultValue: 16, minValue: 1, maxValue: 16 },
      { name: 'frequencyReduction', defaultValue: 0, minValue: 0, maxValue: 1 }
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.lastValue = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const bits = parameters.bits;
    const frequencyReduction = parameters.frequencyReduction;

    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      for (let i = 0; i < inputChannel.length; i++) {
        // Use the first parameter value if it's not being automated
        const b = bits.length > 1 ? bits[i] : bits[0];
        const f = frequencyReduction.length > 1 ? frequencyReduction[i] : frequencyReduction[0];

        const step = Math.pow(0.5, b);
        
        this.phase += f;
        if (this.phase >= 1.0) {
          this.phase -= 1.0;
          this.lastValue = step * Math.floor(inputChannel[i] / step + 0.5);
        }
        outputChannel[i] = this.lastValue;
      }
    }
    return true; // Keep processor alive
  }
}

registerProcessor('bitcrusher-processor', BitcrusherProcessor);
