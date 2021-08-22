.PHONY: web clean package release widgets

all: web package

web: package
	releng/buildAlksDiagram.sh
	releng/buildWidgetReleases.sh
	cp dist/*.whl docs/releases/latest/pinion-latest.whl
	cp dist/*.tar.gz docs/releases/latest/pinion-latest.tar.gz
	mkdocs build

package:
	releng/updatePinionWidgetResources.sh

	rm -f dist/*
	python setup.py sdist bdist_wheel

release: package
	twine upload dist/*

clean:
	rm -rf dist build site