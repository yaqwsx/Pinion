.PHONY: web clean package release widgets

all: web package

web:
	releng/buildAlksDiagram.sh
	releng/buildWidgetReleases.sh
	mkdocs build

package:
	releng/syncWidgetVersion.sh
	releng/updatePinionWidgetResources.sh

	rm -f dist/*
	python setup.py sdist bdist_wheel

release: package
	twine upload dist/*

clean:
	rm -rf dist build site