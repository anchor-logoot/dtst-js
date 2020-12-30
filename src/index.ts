/**
 * @file A binary search tree implementation for finding ranges within the tree
 * and finding neighboring nodes. The documentation for this is, erm, not super
 * amazing.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import 'regenerator-runtime/runtime'

import { TypeRange, NumberRange, CompareResult } from './compare'

export * from './compare'

/**
 * Returns a function that will return the value of `cb` by calling it once,
 * then returning the same value each time after. This is used to compute a
 * value that may be used multiple times, but is expensive to compute if
 * unnecessary.
 * @param cb The function to determine the value of
 * @returns The value returned by `cb`
 */
function ifNeeded<T>(cb: () => T): () => T {
  let val: T
  let computed = false
  return () => {
    if (!computed) {
      val = cb()
      computed = true
    }
    return val
  }
}

class TypeRangeSearch<T, R> {
  readonly buckets: {
    lesser: [T, R][]
    range: [T, R][]
    greater: [T, R][]
  } = { lesser: [], range: [], greater: [] }
  constructor(public range: TypeRange<T>) {}

  addToBucket(bucket: 'lesser' | 'range' | 'greater', val: T, obj: R): void {
    this.buckets[bucket].push([val, obj])
  }
  setBucket(bucket: 'lesser' | 'greater', val: T, obj: R): void {
    let cval: CompareResult
    if (
      !this.buckets[bucket].length ||
      (cval = this.range.cf(val, this.buckets[bucket][0][0])) === 0
    ) {
      this.buckets[bucket].push([val, obj])
      return
    }
    if (bucket === 'lesser' && cval > 0) {
      this.buckets.lesser = [[val, obj]]
    } else if (bucket === 'greater' && cval < 0) {
      this.buckets.greater = [[val, obj]]
    }
  }
}

const noRootUpdateFunction = (): void => {
  throw new TypeError(
    'No root update function was provided, but a root update was attempted'
  )
}

export abstract class DTstNode<T extends DTstNode<T>> {
  parent_node?: T
  left_node?: T
  right_node?: T
  readonly equal_nodes: T[] = []

  constructor(public value: number = 0) {}

  /**
   * The actual value of this node. The `value` member only stores the value
   * *relative to the parent node.*
   */
  get absolute_value(): number {
    return this.value + (this.parent_node ? this.parent_node.absolute_value : 0)
  }

  /**
   * Order nodes that have the same `value` may be ordered differently using
   * this function. This function must follow these rules:
   * 1. It must return values other than 0 if multiple nodes may have the
   * same `value` in your implementation. Basically, if you ever have zero
   * length nodes or nodes with the same position, you **have** to use this for
   * things to not break.
   * 2. It must define the same order as if the nodes were ordered by value
   * (with the exception of unorderable equal nodes).
   */
  abstract preferential_cmp(other: T): CompareResult

  /**
   * Called by the TST only. **DO NOT** use. This is only public because JS has
   * no concept of C++ `friend` classes and I need to use this function in unit
   * tests. Call the `add` function on the TST object instead.
   * @param node The node to add
   * @param rootUpdate A function that will be called if the TST root needs to
   * be updated. A TypeError will be thrown if one is not provided.
   */
  addChild(node: T, rootUpdate: (np: T) => void = noRootUpdateFunction): void {
    node.value -= this.value
    if (node.value > 0) {
      if (this.right_node) {
        this.right_node.addChild(node)
      } else {
        this.right_node = node as T
        // T will always be an instance of DTstNode<T>
        ;(node as DTstNode<T>).parent_node = (this as unknown) as T
      }
    } else if (node.value < 0) {
      if (this.left_node) {
        this.left_node.addChild(node)
      } else {
        this.left_node = node as T
        ;(node as DTstNode<T>).parent_node = (this as unknown) as T
      }
    } else {
      const prefres = this.preferential_cmp(node)
      if (prefres === 0) {
        throw new TypeError('Duplicate node added')
      }
      if (prefres > 0) {
        if (this.parent_node) {
          if (this.value > 0) {
            this.parent_node.right_node = node
          } else {
            this.parent_node.left_node = node
          }
          node.parent_node = this.parent_node
        } else {
          rootUpdate(node)
        }

        node.value = this.value
        this.value = 0

        if (this.left_node) {
          node.left_node = this.left_node
          delete this.left_node
          node.left_node.parent_node = node
        }
        if (this.right_node) {
          node.right_node = this.right_node
          delete this.right_node
          node.right_node.parent_node = node
        }

        node.equal_nodes.push((this as unknown) as T, ...this.equal_nodes)
        this.equal_nodes.length = 0
        node.equal_nodes.forEach((n) => (n.parent_node = node))
      } else {
        node.parent_node = (this as unknown) as T
        for (let i = this.equal_nodes.length - 1; i >= 0; i--) {
          const prefres = this.equal_nodes[i].preferential_cmp(node)
          if (prefres === 0) {
            throw new TypeError('Duplicate node added')
          }
          if (prefres < 0) {
            this.equal_nodes.splice(i + 1, 0, node)
            return
          }
        }
        this.equal_nodes.unshift(node)
      }
    }
  }

  /**
   * Finds the smallest child of this node **not** including equal nodes.
   */
  get smallest_child(): T | undefined {
    if (this.left_node) {
      return this.left_node.smallest_child || this.left_node
    } else if (this.right_node) {
      return this.right_node.smallest_child || this.right_node
    }
    return undefined
  }
  /**
   * Finds the smallest child that is smaller than this node **not** including
   * equal nodes.
   */
  get smallest_smaller_child(): T | undefined {
    if (this.left_node) {
      return this.left_node.smallest_smaller_child || this.left_node
    }
    return undefined
  }
  /**
   * Finds the largest child of this node **not** including equal nodes.
   */
  get largest_child(): T | undefined {
    if (this.right_node) {
      return this.right_node.largest_child || this.right_node
    } else if (this.left_node) {
      return this.left_node.largest_child || this.left_node
    }
    return undefined
  }
  /**
   * Finds the largest child that is larger than this node **not** including
   * equal nodes.
   */
  get largest_larger_child(): T | undefined {
    if (this.right_node) {
      return this.right_node.largest_larger_child || this.right_node
    }
    return undefined
  }

  /**
   * The highest parent of this node that has the same value or this node if
   * there is no such node.
   */
  get equal_parent(): T {
    if (this.value === 0 && this.parent_node) {
      return this.parent_node.equal_parent
    }
    return (this as unknown) as T
  }
  /**
   * The root of the TST.
   */
  get root(): T {
    return this.parent_node ? this.parent_node.root : ((this as unknown) as T)
  }

  /**
   * The next node in sequence.
   */
  get inorder_successor(): T | undefined {
    if (this.equal_nodes.length) {
      return this.equal_nodes[0]
    }
    if (this.right_node) {
      return this.right_node.smallest_smaller_child || this.right_node
    }
    if (this.value === 0) {
      if (this.parent_node) {
        const eqn = this.parent_node.equal_nodes
        const s = eqn[eqn.indexOf((this as unknown) as T) + 1]
        if (s) {
          return s
        }
      }
      if (this.parent_node?.right_node) {
        return (
          this.parent_node.right_node.smallest_smaller_child ||
          this.parent_node.right_node
        )
      }
    }
    let node: T | undefined = (this as unknown) as T
    while (node) {
      // Return parent if to left
      if (
        node.value <= 0 &&
        node.parent_node &&
        node.parent_node.left_node === node
      ) {
        return node.parent_node
      }
      // Otherwise, traverse up
      node = node.parent_node
    }
    return undefined
  }
  *successorIterator(): IterableIterator<T> {
    let node: T | undefined = (this as unknown) as T
    while ((node = node.inorder_successor)) {
      yield node
    }
  }

  /**
   * The previous node in sequence.
   */
  get inorder_predecessor(): T | undefined {
    if (this.left_node) {
      const node = this.left_node.largest_larger_child || this.left_node
      if (node.equal_nodes.length) {
        return node.equal_nodes[node.equal_nodes.length - 1]
      }
      return node
    }
    let node: T | undefined = (this as unknown) as T
    while (node) {
      if (node.value === 0) {
        if (!node.parent_node) {
          return undefined
        }
        const eqn = node.parent_node.equal_nodes
        const i = eqn.indexOf(node)
        if (i === 0) {
          return node.parent_node
        }
        const s = eqn[i - 1]
        if (s) {
          return s
        }
      }
      if (
        node.value > 0 &&
        node.parent_node &&
        node.parent_node.right_node === node
      ) {
        if (node.parent_node.equal_nodes.length) {
          const eqn = node.parent_node.equal_nodes
          return eqn[eqn.length - 1]
        }
        return node.parent_node
      }
      node = node.parent_node
    }
    return undefined
  }
  *predecessorIterator(): IterableIterator<T> {
    let node: T | undefined = (this as unknown) as T
    while ((node = node.inorder_predecessor)) {
      yield node
    }
  }

  /**
   * **THIS IS NOT INTENDED FOR OUTSIDE USE!** It is not protected for the unit
   * tests that rely on it.
   *
   * Replaces this node with another node. This is used internally by the
   * `remove` function. If the node provided has a parent, it will be removed
   * from the parent. **WARNING:** If the provided node's current children
   * conflict with the children of the destination node, the destination node's
   * children have priority.
   * @param data New node
   * @param rootUpdate A function that will be called if the TST root needs to
   * be updated. A TypeError will be thrown if one is not provided.
   * @param value The value to use for the new node. It defaults to the node's
   * `absolute_value`.
   */
  replaceWith(
    data: T | undefined,
    rootUpdate: (np: T | undefined) => void = noRootUpdateFunction,
    value = data?.absolute_value
  ): T {
    // First, set up the new node
    if (data) {
      data.value = (value as number) - this.absolute_value + this.value
    }
    if (data) {
      if (data.parent_node) {
        let index
        if (data.parent_node.left_node === data) {
          delete data.parent_node.left_node
        } else if (data.parent_node.right_node === data) {
          delete data.parent_node.right_node
        } else if ((index = data.parent_node.equal_nodes.indexOf(data)) >= 0) {
          data.parent_node.equal_nodes.splice(index, 1)
        }
        delete data.parent_node
      }
    }
    // Set up parent node
    if (this.parent_node) {
      // Value cannot be relied upon here; The DTst may be temporarily corrupt
      if (this.parent_node.left_node === ((this as unknown) as T)) {
        this.parent_node.left_node = data
      }
      if (this.parent_node.right_node === ((this as unknown) as T)) {
        this.parent_node.right_node = data
      }
      let index
      if (
        (index = this.parent_node.equal_nodes.indexOf(
          (this as unknown) as T
        )) >= 0
      ) {
        if (data) {
          this.parent_node.equal_nodes.splice(index, 1, data)
        } else {
          this.parent_node.equal_nodes.splice(index, 1)
        }
      }
    } else {
      rootUpdate(data)
    }
    if (data) {
      data.parent_node = this.parent_node
    }

    // Transplant children
    // Difference between previous parent (`this`) and new parent (`data`)
    const diffval = ifNeeded<number>(
      () => this.absolute_value - (data as T).absolute_value
    )
    if (data && this.left_node && this.left_node !== data) {
      data.left_node = this.left_node
      data.left_node.parent_node = data
      data.left_node.value += diffval()
    }
    if (data && this.right_node && this.right_node !== data) {
      data.right_node = this.right_node
      data.right_node.parent_node = data
      data.right_node.value += diffval()
    }
    if (this.equal_nodes.length) {
      throw new TypeError('Node cannot currently have equal nodes')
    }

    // Clear out this node
    delete this.parent_node
    delete this.right_node
    delete this.left_node

    // Ensure that the right side does not contain equal nodes. This can happen
    // if nodes are replaced in order, but the new node has the same value.
    // TODO: Decide if necessary
    let node = data?.right_node
    let traversal_value = 0
    while (node) {
      traversal_value += node.value
      if (traversal_value === 0) {
        if (node.left_node) {
          throw new TypeError(
            'Out-of-order offset must have been attempted: There are' +
              'non-successor nodes with equal value'
          )
        }
        break
      }
      node = node.left_node
    }
    if (node) {
      const eqn = [node, ...node.equal_nodes]
      node.equal_nodes.length = 0
      node.remove()
      ;(data as T).equal_nodes.push(...eqn)
      eqn.forEach((n) => (n.parent_node = data))

      node.parent_node = data
      node.value = 0
    }

    node = data?.left_node
    traversal_value = 0
    while (node) {
      traversal_value += node.value
      if (traversal_value === 0) {
        if (node.right_node) {
          throw new TypeError(
            'Out-of-order offset must have been attempted: There are' +
              'non-successor nodes with equal value'
          )
        }
        break
      }
      node = node.right_node
    }
    if (node) {
      const eqn = [...node.equal_nodes]
      node.equal_nodes.length = 0
      node.remove()
      ;(data as T).replaceWith(node)
      node.equal_nodes.push(...eqn, data as T, ...(data as T).equal_nodes)
      ;(data as T).equal_nodes.forEach((n) => (n.parent_node = node))
      ;(data as T).parent_node = node
      ;(data as T).equal_nodes.length = 0
      ;(data as T).value = 0
    }

    return (this as unknown) as T
  }

  /**
   * Removes this node from the TST. The node's `absolute_value` will be
   * preserved, so it can be directly re-added to the TST.
   * @param rootUpdate This function is called if the `tst_root` of the TST
   * must be updated. Normally, it should be given the value of
   * `(node) => (tst.tst_root = node)`. If no value is provided, an error will
   * be thrown if an update is attempted. **For this reason, if you expect that
   * no root update will be required for whatever reason, do not provide a
   * value.** This will ensure that an error is thrown and a potential bug is
   * caught.
   */
  remove(rootUpdate?: (np: T | undefined) => void): void {
    let cnode: T | undefined
    if (this.equal_nodes.length) {
      cnode = this.equal_nodes.shift()
      // `cnode` must be defined since we know there's stuff in the array
      ;(cnode as T).equal_nodes.push(...this.equal_nodes)
      this.equal_nodes.forEach((n) => (n.parent_node = cnode))
      this.equal_nodes.length = 0
      ;(cnode as T).value = this.absolute_value
    } else if (this.right_node && this.left_node) {
      cnode = this.inorder_successor
      // Ensure we have the parent of equal nodes (equal nodes will have to be
      // re-added later)
      // We know `cnode` is defined because if we have a right child, then we
      // must have a successor
      while ((cnode as T).value === 0 && (cnode as T).parent_node) {
        // TODO: This shouldn't run more than once, right? So take it out of the
        // loop? Double check this
        cnode = (cnode as T).parent_node
      }

      // Keep the value here while we remove (`remove` needs the tree to
      // be preserved)
      ;(cnode as T).remove(rootUpdate)
    } else if (this.right_node) {
      cnode = this.right_node
      cnode.value = cnode.absolute_value
    } else if (this.left_node) {
      cnode = this.left_node
      cnode.value = cnode.absolute_value
    } else {
      cnode = undefined
    }
    const absval = this.absolute_value
    this.replaceWith(cnode, rootUpdate, cnode?.value)
    this.value = absval

    let node = cnode
    while (node?.parent_node && node.value === 0) {
      node = node.parent_node
    }
  }
  removeChild(
    value: number,
    filter: (data: T) => boolean = (): boolean => true,
    vals: T[] = [],
    rootUpdate?: (np: T | undefined) => void
  ): T[] {
    const tryRmLeft = (): void => {
      if (this.left_node) {
        this.left_node.removeChild(value - this.left_node.value, filter, vals)
      }
    }
    const tryRmRight = (): void => {
      if (this.right_node) {
        this.right_node.removeChild(value - this.right_node.value, filter, vals)
      }
    }
    if (value <= 0) {
      tryRmLeft()
    } else {
      tryRmRight()
    }
    if (value === 0 && filter((this as unknown) as T)) {
      vals.push((this as unknown) as T)
      this.remove(rootUpdate)
    }
    return vals
  }

  /**
   * Applies an offset to the node's starting position. This will offset all
   * nodes after this one efficiently. There's just one catch: This **may not**
   * change the order of the TST. No errors will be thrown (or can, efficiently
   * at least), so just make sure your code doesn't change the order. This will
   * not mutate the TST *unless* the position of a node becomes equal to that
   * of another node. In that case, the TST will be re-arranged so that the
   * equal nodes form a linked list under the left side of the root equal node
   * as required.
   * @param s The offset to apply to this node's start. This may be positive to
   * add space before or negative to remove space before.
   * @param rootUpdate A function that will be called if the TST root needs to
   * be updated. A TypeError will be thrown if one is not provided.
   */
  addSpaceBefore(
    s: number,
    rootUpdate: (np: T | undefined) => void = noRootUpdateFunction
  ): void {
    let id
    if (
      s > 0 &&
      this.parent_node &&
      (id = this.parent_node.equal_nodes.indexOf((this as unknown) as T)) >= 0
    ) {
      const old_parent = this.parent_node
      old_parent.equal_nodes.splice(id, 1)
      this.equal_nodes.push(
        ...old_parent.equal_nodes.splice(id, old_parent.equal_nodes.length - id)
      )
      this.equal_nodes.forEach((n) => (n.parent_node = (this as unknown) as T))

      // Now, move into the right position. The value of 1 is required so that
      // the incrementing loop below functions correctly.
      this.value = 1
      if (old_parent.right_node) {
        this.right_node = old_parent.right_node
        this.right_node.parent_node = (this as unknown) as T
      }
      old_parent.right_node = (this as unknown) as T
      this.parent_node = old_parent
    }

    let next: T | undefined = (this as unknown) as T
    let cumulative = 0
    while (next) {
      // Increment `next` value if it's greater than `this`
      if (cumulative >= 0) {
        cumulative -= next.value
        next.value += s
        // Ensure that the left node's position is not changed
        if (next.left_node) {
          next.left_node.value -= s
        }
      } else {
        cumulative -= next.value
      }
      next = next.parent_node
    }

    // Ensure that if the start value is subtracted, this node is added to
    // `equal_nodes` of another node **if necessary.**
    // Most other "smarter" ways of doing this (other than re-adding the node)
    // involve TST traversals to root anyway, so this is equally inefficient ;)
    if (s < 0) {
      let root: T | undefined = this.root
      const equal_nodes = [...this.equal_nodes]
      this.equal_nodes.length = 0

      this.remove((n) => {
        root = n
        rootUpdate(n)
      })
      root.addChild((this as unknown) as T, rootUpdate)

      if (this.value === 0 && this.parent_node) {
        // `this` must've been added to the end. If not, then an invalid
        // operation was performed.
        equal_nodes.forEach((n) => (this.parent_node as T).equal_nodes.push(n))
        equal_nodes.forEach((n) => (n.parent_node = this.parent_node))
      } else {
        equal_nodes.forEach((n) => this.equal_nodes.push(n))
        equal_nodes.forEach((n) => (n.parent_node = (this as unknown) as T))
      }
    }

    // This is just a sneaky way to check if the `if` statement above ran
    if (id !== undefined && id >= 0) {
      // Subtract out the residual 1
      this.value -= 1
    }
  }

  /**
   * Searches the DTst based on node value.
   * @param s The range to search
   */
  search(s: TypeRangeSearch<number, T>, cval: number): void {
    cval += this.value
    ;(s.range as NumberRange).push_offset(-this.value)

    const traverse_left = (): void => {
      if (this.left_node) {
        this.left_node.search(s, cval)
      }
    }
    const traverse_right = (): void => {
      if (this.right_node) {
        this.right_node.search(s, cval)
      }
    }

    const sec = s.range.getRangeSection(0)
    if (sec < 0) {
      // We're under the target range...

      // Try assigning this or the last equal node to a bucket (if the current
      // value is greater, this will be ignored.)
      s.setBucket('lesser', cval, (this as unknown) as T)
      this.equal_nodes.forEach((n) => s.setBucket('lesser', cval, n))
      // Always traverse right since it could be greater
      traverse_right()
    } else if (sec > 0) {
      // We're above the target range...

      // The same as above, but with the `greater` bucket
      s.setBucket('greater', cval, (this as unknown) as T)
      this.equal_nodes.forEach((n) => s.setBucket('greater', cval, n))
      // Always try to find a smaller node
      traverse_left()
    } else {
      // We're in the target range...

      s.addToBucket('range', cval, (this as unknown) as T)
      this.equal_nodes.forEach((n) => s.addToBucket('range', cval, n))
      // Now, we have to traverse left **and** right
      traverse_left()
      traverse_right()
    }

    ;(s.range as NumberRange).pop_offset(-this.value)
  }

  /**
   * Searches the DTst based on the values of `preferential_cmp` only. Useful
   * for searching for a node when its value is not known.
   * @param s The range to search
   * @todo More efficient searches of equal nodes
   */
  prefSearch(s: TypeRangeSearch<T, T>): void {
    const traverse_left = (): void => {
      if (this.left_node) {
        this.left_node.prefSearch(s)
      }
    }
    const traverse_right = (): void => {
      if (this.right_node) {
        this.right_node.prefSearch(s)
      }
    }
    const traverse_equal = (): void => {
      this.equal_nodes.forEach((n) => n.prefSearch(s))
    }
    const bucket = (name: 'lesser' | 'range' | 'greater', val: T) => {
      // In this case, both the value and node are the same
      if (name === 'range') {
        s.addToBucket(name, val, val)
      } else {
        s.setBucket(name, val, val)
      }
    }

    const sec = s.range.getRangeSection((this as unknown) as T)
    if (sec < 0) {
      // We're under the target range...

      // Try assigning this to a bucket (if the current value is greater, this)
      // will be ignored.
      bucket('lesser', (this as unknown) as T)
      traverse_equal()
      // Always traverse right since it could be greater
      traverse_right()
    } else if (sec > 0) {
      // We're above the target range...

      // The same as above, but with the `greater` bucket
      bucket('greater', (this as unknown) as T)
      traverse_equal()
      // Always try to find a smaller node
      traverse_left()
    } else {
      // We're in the target range...

      bucket('range', (this as unknown) as T)
      traverse_equal()
      // Now, we have to traverse left **and** right
      traverse_left()
      traverse_right()
    }
  }

  operateOnAll(cb: (data: T) => void): void {
    if (this.left_node) {
      this.left_node.operateOnAll(cb)
    }
    cb((this as unknown) as T)
    this.equal_nodes.forEach((n) => cb(n))
    if (this.right_node) {
      this.right_node.operateOnAll(cb)
    }
  }

  /**
   * Creates a virtual tree showing right, left, and equal nodes. Very useful
   * when debugging TST issues.
   */
  toDeepString(): string {
    let str = `${this}\n` + this.equal_nodes.map((n) => `${n}\n`).join('')
    const dstr = (node: T): string =>
      node.toDeepString().split('\n').join('\n    ')
    if (this.left_node) {
      str += `  L: ${dstr(this.left_node)}\n`
    } else {
      str += '  L: undefined\n'
    }
    if (this.right_node) {
      str += `  R: ${dstr(this.right_node)}`
    } else {
      str += '  R: undefined'
    }
    return str
  }

  selfTest(
    parent?: T,
    is_left?: boolean,
    mnv = 0,
    mxv = 0,
    known: DTstNode<T>[] = []
  ): void {
    if (known.includes(this)) {
      throw new Error('Duplicate nodes or node loop')
    }
    known.push(this)
    if (this.value <= mnv) {
      throw new Error('Node has wrong position for location')
    } else if (this.value >= mxv) {
      throw new Error('Node has wrong position for location')
    }
    if (this.parent_node !== parent) {
      throw new Error('Node does not have correct parent')
    }
    if (is_left === true && this.value > 0) {
      throw new Error('Node has wrong value for location')
    } else if (is_left === false && this.value <= 0) {
      throw new Error('Node has wrong value for location')
    }
    if (this.left_node) {
      this.left_node.selfTest(
        (this as unknown) as T,
        true,
        mnv - this.value,
        0,
        known
      )
    }
    if (this.right_node) {
      this.right_node.selfTest(
        (this as unknown) as T,
        false,
        0,
        mxv - this.value,
        known
      )
    }
    this.equal_nodes.forEach((n) => n.selfTestEqual((this as unknown) as T))
    let last: T = (this as unknown) as T
    this.equal_nodes.forEach((node) => {
      if (last.preferential_cmp(node) >= 0) {
        throw new Error('Equal nodes are not sequential')
      }
      last = node
    })
  }
  selfTestEqual(parent?: T, known: DTstNode<T>[] = []): void {
    if (known.includes(this)) {
      throw new Error('Duplicate nodes or node loop')
    }
    known.push(this)
    if (this.value !== 0) {
      throw new Error('Equal nodes cannot have value')
    }
    if (this.parent_node !== parent) {
      throw new Error('Node does not have correct parent')
    }
    if (this.right_node || this.left_node || this.equal_nodes.length) {
      throw new Error('Equal nodes cannot have children')
    }
  }
}

export class DTst<T extends DTstNode<T>> {
  tst_root?: T = undefined

  add(node: T): T {
    if (!this.tst_root) {
      this.tst_root = node
    } else {
      this.tst_root.addChild(node, (n) => (this.tst_root = n))
    }
    return node
  }
  remove(
    value: number,
    filter: (data: T) => boolean = (): boolean => true
  ): T[] {
    const vals: T[] = []
    if (this.tst_root) {
      this.tst_root.removeChild(
        value - this.tst_root.value,
        filter,
        vals,
        (p: T | undefined) => (this.tst_root = p)
      )
    }
    return vals
  }
  removeNode(node: T): void {
    node.remove((np: T | undefined) => (this.tst_root = np))
  }

  search(range: NumberRange): TypeRangeSearch<number, T> {
    const search = new TypeRangeSearch<number, T>(range)
    if (this.tst_root) {
      this.tst_root.search(search, 0)
    }
    return search
  }
  prefSearch(range: TypeRange<T>): TypeRangeSearch<T, T> {
    const search = new TypeRangeSearch<T, T>(range)
    if (this.tst_root) {
      this.tst_root.prefSearch(search)
    }
    return search
  }

  operateOnAll(cb: (data: T) => void): void {
    if (this.tst_root) {
      this.tst_root.operateOnAll(cb)
    }
  }

  get all_nodes(): T[] {
    const nodes: T[] = []
    this.operateOnAll((n) => nodes.push(n))
    return nodes
  }

  toString(): string {
    let str = 'DTst [\n'
    this.operateOnAll((data) => {
      str += '  ' + data.toString().split('\n').join('\n  ') + '\n'
    })
    str += ']'
    return str
  }

  toDeepString(): string {
    let str = `DTst [\n`
    if (this.tst_root) {
      str += '  ' + this.tst_root.toDeepString()
    }
    str += '\n]'
    return str
  }

  selfTest(): void {
    if (this.tst_root) {
      this.tst_root.selfTest(undefined, undefined, -Infinity, Infinity)
    }
  }
}
