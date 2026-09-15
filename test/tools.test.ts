import { describe, it, expect } from 'vitest';
import { TOOL_SPECS } from '../src/agent/tools';

describe('TOOL_SPECS', () => {
  it('defines the expected agentic file tools', () => {
    const names = TOOL_SPECS.map((t) => t.function.name);
    expect(names).toEqual(
      expect.arrayContaining(['read_file', 'list_directory', 'search_workspace', 'write_file', 'edit_file', 'delete_file'])
    );
  });

  it('every tool has a description and required params', () => {
    for (const tool of TOOL_SPECS) {
      expect(tool.function.description.length).toBeGreaterThan(10);
      expect(tool.function.parameters.required?.length).toBeGreaterThan(0);
    }
  });
});
