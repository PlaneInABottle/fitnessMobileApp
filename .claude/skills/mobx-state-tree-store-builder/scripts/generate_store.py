#!/usr/bin/env python3
"""
MST Store Generator Script

Generates MobX State Tree stores following Purrsuit patterns.
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional
import argparse

def generate_domain_model(name: str, properties: Dict[str, str]) -> str:
    """Generate a domain model template."""

    # Convert properties to MST types
    prop_lines = []
    for prop_name, prop_type in properties.items():
        if prop_type == "string":
            prop_lines.append(f"    {prop_name}: types.string,")
        elif prop_type == "number":
            prop_lines.append(f"    {prop_name}: types.number,")
        elif prop_type == "boolean":
            prop_lines.append(f"    {prop_name}: types.boolean,")
        elif prop_type.startswith("optional:"):
            base_type = prop_type.split(":", 1)[1]
            if base_type == "string":
                prop_lines.append(f"    {prop_name}: types.maybe(types.string),")
            elif base_type == "number":
                prop_lines.append(f"    {prop_name}: types.maybe(types.number),")
            else:
                prop_lines.append(f"    {prop_name}: types.maybe(types.{base_type}),")

    props_str = "\n".join(prop_lines)

    return f'''import {{ Instance, SnapshotIn, SnapshotOut, types }} from "mobx-state-tree"

/**
 * {name} domain model
 */
export const {name}Model = types
  .model("{name}", {{
    id: types.identifier,
{props_str}
  }})
  .views((self) => ({{
    /**
     * Computed property example
     */
    get displayName() {{
      return self.name || "Unnamed"
    }},
  }}))
  .actions((self) => ({{
    /**
     * Update example property
     */
    setName(name: string) {{
      self.name = name
    }},
  }}))

export interface I{name} extends Instance<typeof {name}Model> {{}}
export interface I{name}SnapshotIn extends SnapshotIn<typeof {name}Model> {{}}
export interface I{name}SnapshotOut extends SnapshotOut<typeof {name}Model> {{}}
'''

def generate_collection_store(name: str, model_name: str) -> str:
    """Generate a collection store template."""

    store_name = name
    collection_name = model_name.lower() + "s"

    return f'''import {{ Instance, SnapshotIn, SnapshotOut, types, getRoot }} from "mobx-state-tree"
import type {{ IRootStore }} from "./RootStore"

import {{ {model_name}Model }} from "./{model_name}"

/**
 * Store for managing collection of {model_name}
 */
export const {store_name}Model = types
  .model("{store_name}", {{
    {collection_name}: types.optional(types.map({model_name}Model), {{}}),
  }})
  .views((self) => ({{
    /**
     * Get all items as array
     */
    get {collection_name}Array() {{
      return Array.from(self.{collection_name}.values())
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    }},

    /**
     * Find item by ID
     */
    getById(id: string) {{
      return self.{collection_name}.get(id)
    }},

    /**
     * Get total count
     */
    get count() {{
      return self.{collection_name}.size
    }},
  }}))
  .actions((self) => ({{
    /**
     * Add new {model_name.lower()}
     */
    add{model_name}(item: SnapshotIn<typeof {model_name}Model>) {{
      self.{collection_name}.put(item)
    }},

    /**
     * Remove {model_name.lower()}
     */
    remove{model_name}(id: string) {{
      self.{collection_name}.delete(id)
    }},

    /**
     * Clear all {collection_name}
     */
    clearAll() {{
      self.{collection_name}.clear()
    }},
  }}))

export interface I{store_name} extends Instance<typeof {store_name}Model> {{}}
export interface I{store_name}SnapshotIn extends SnapshotIn<typeof {store_name}Model> {{}}
export interface I{store_name}SnapshotOut extends SnapshotOut<typeof {store_name}Model> {{}}
'''

def generate_singleton_store(name: str) -> str:
    """Generate a singleton store template."""

    return f'''import {{ Instance, SnapshotIn, SnapshotOut, types }} from "mobx-state-tree"

/**
 * Store for managing {name.lower().replace("store", "")} functionality
 */
export const {name}Model = types
  .model("{name}", {{
    // Configuration
    isEnabled: types.optional(types.boolean, true),

    // State
    isLoading: false,
    error: types.maybe(types.string),
  }})
  .views((self) => ({{
    /**
     * Computed readiness state
     */
    get isReady() {{
      return !self.isLoading && !self.error
    }},
  }}))
  .actions((self) => ({{
    /**
     * Set loading state
     */
    setLoading(loading: boolean) {{
      self.isLoading = loading
    }},

    /**
     * Set error state
     */
    setError(error: string | undefined) {{
      self.error = error
    }},
  }}))

export interface I{name} extends Instance<typeof {name}Model> {{}}
export interface I{name}SnapshotIn extends SnapshotIn<typeof {name}Model> {{}}
export interface I{name}SnapshotOut extends SnapshotOut<typeof {name}Model> {{}}
'''

def main():
    parser = argparse.ArgumentParser(description="Generate MST stores")
    parser.add_argument("type", choices=["model", "collection", "singleton"],
                       help="Type of store to generate")
    parser.add_argument("name", help="Name of the store/model")
    parser.add_argument("--model", help="Model name for collection stores")
    parser.add_argument("--properties", nargs="*", help="Properties for domain models (name:type)")

    args = parser.parse_args()

    if args.type == "model":
        if not args.properties:
            print("Error: Properties required for domain models")
            sys.exit(1)

        props = {}
        for prop in args.properties:
            name, type_ = prop.split(":", 1)
            props[name] = type_

        code = generate_domain_model(args.name, props)

    elif args.type == "collection":
        if not args.model:
            print("Error: Model name required for collection stores")
            sys.exit(1)

        code = generate_collection_store(args.name, args.model)

    elif args.type == "singleton":
        code = generate_singleton_store(args.name)

    print(code)

if __name__ == "__main__":
    main()