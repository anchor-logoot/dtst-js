# dtst-js

**D**ifferential **T**ernary **S**earch **T**ree **JS**

## 🚧 Work In Progress 🚧

Currently, there is no tree balancing done, no optimizations have been considered, and documentation is relatively poor.
This is because this package was pulled out of the code base of `logootish-js` and I haven't had time to go through and
make proper examples.

## What is it?

**TL;DR** it's an algorithm for storing, finding, and quickly applying offsets to a number for an ordered list of nodes.

This is a custom algorithm derived from a binary search tree. It was designed to model text sequences that may require
nodes to be shifted over in bulk. Let's assume that each node in a traditional BST has a numeric position. Shifting
many of these positions is quite expensive since one would need to iterate over every node after the position being
shifted. Instead, it would be quite a bit easier if we could make positions of nodes relative to one another. This is
exactly what this algorithm does. Each node *must* have an integer `value`. The primary method of sorting nodes is by
their value. Once added to the tree, a node's value may be computed by using the `absolute_value` getter.

However, note that I'm calling this a differential *ternary* search tree, not binary. As it turns out, if you have nodes
that are being shifted around that may potentially have the same value, it's quite easy to corrupt the tree. To make
this easier, instead of placing nodes with equal value to a parent in the left side of the tree, an array is added to
each node to store nodes with the same value. This means that all nodes to the left of a node have a lower value and
nodes to the right have a greater value. However, in the case of zero length nodes, it is often desireable to keep them
in order so that they stay in order when you offset them. In other words, if you have five nodes of zero length and you
offset the middle node, you often want to keep these five nodes in order so that you know which three nodes will be
offset as a result. This is done by defining a `preferential_cmp` method in the abstract class. This will be used to
determine order when nodes have the same value. **This must return the same order as `value` in all cases.** You also
**can just set it to return 0 all the time if you don't plan on having nodes with the same value.**

So, there you have it. To add custom data, just extend the `DTstNode` class (the type parameter is just the type of your
new class) and start adding your nodes to a `DTst` (the type paramater is just the type of your nodes).
**Note that nodes can only be added to a single `DTst`.**

## Docs and examples

For now, there's just the JSDoc. Sorry.

## Development

```bash

# Install deps
yarn

# Check types
yarn run check-types

# Just lint
yarn run lint

# Build for production (and lint)
yarn run build

# Build jsdoc
yarn run build:docs

# Test
yarn run test

# Test with auto reloads
yarn run test:watch

# Get test coverage
yarn run test:cover

```
